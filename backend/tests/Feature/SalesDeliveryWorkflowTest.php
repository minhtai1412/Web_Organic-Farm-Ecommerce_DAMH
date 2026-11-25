<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SalesDeliveryWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_sales_can_dispatch_a_confirmed_order(): void
    {
        $orderId = $this->createOrder('Da_xac_nhan');
        $sales = $this->salesUser();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/dispatch", [
                'don_vi_van_chuyen' => 'Viettel Post',
                'ma_van_don' => 'XANHFARM-TEST-1001',
                'ghi_chu' => 'Giao trong giờ hành chính.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Dang_giao');

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'Dang_giao',
        ]);
        $this->assertDatabaseHas('giao_hang', [
            'Ma_don_hang' => $orderId,
            'Ma_nhan_vien_dieu_phoi' => $sales->Ma_nguoi_dung,
            'Don_vi_van_chuyen' => 'Viettel Post',
            'Ma_van_don' => 'XANHFARM-TEST-1001',
            'Trang_thai' => 'Dang_giao',
            'Ghi_chu_dieu_phoi' => 'Giao trong giờ hành chính.',
        ]);
    }

    public function test_successful_delivery_collects_cod_and_awards_points_once(): void
    {
        $orderId = $this->createOrder('Dang_giao');
        $this->createDelivery($orderId);
        $this->createCodPayment($orderId);
        $sales = $this->salesUser();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/delivery-success")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cod_collected']);

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/delivery-success", ['cod_collected' => true])
            ->assertOk()
            ->assertJsonPath('data.status', 'Hoan_thanh')
            ->assertJsonPath('data.points_earned', 50);

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'Hoan_thanh',
        ]);
        $this->assertDatabaseHas('giao_hang', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'Giao_thanh_cong',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'Trang_thai' => 'Thanh_cong',
        ]);
        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Tich_diem',
            'So_diem' => 50,
        ]);

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/delivery-success", ['cod_collected' => true])
            ->assertUnprocessable();
        $this->assertSame(
            1,
            DB::table('diem_tich_luy')->where('Ma_don_hang', $orderId)->where('Loai_giao_dich', 'Tich_diem')->count()
        );
    }

    public function test_failed_delivery_with_fresh_goods_returns_stock_and_refunds_points(): void
    {
        $fixture = $this->createAllocatedOrder();
        $sales = $this->salesUser();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$fixture['order_id']}/delivery-failure", [
                'ly_do_that_bai' => 'Khách không nghe máy',
                'tinh_trang_hang_hoan' => 'con_tuoi',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_huy')
            ->assertJsonPath('data.points_refunded', 10);

        $this->assertSame(
            $fixture['stock_before_dispatch'],
            (float) DB::table('lo_hang')->where('Ma_lo_hang', $fixture['batch_id'])->value('So_luong_con_lai')
        );
        $this->assertDatabaseHas('bien_dong_kho', [
            'Ma_lo_hang' => $fixture['batch_id'],
            'Loai_bien_dong' => 'Nhap_hoan',
            'So_luong' => 0.25,
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $fixture['order_id'],
            'Phuong_thuc' => 'COD',
            'Trang_thai' => 'That_bai',
        ]);
        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_don_hang' => $fixture['order_id'],
            'Loai_giao_dich' => 'Hoan_diem',
            'So_diem' => 10,
        ]);
    }

    public function test_failed_delivery_with_damaged_goods_records_waste_without_restocking(): void
    {
        $fixture = $this->createAllocatedOrder();
        $sales = $this->salesUser();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$fixture['order_id']}/delivery-failure", [
                'ly_do_that_bai' => 'Hàng bị dập nát khi vận chuyển',
                'tinh_trang_hang_hoan' => 'hu_hong',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_huy');

        $this->assertSame(
            $fixture['stock_after_dispatch'],
            (float) DB::table('lo_hang')->where('Ma_lo_hang', $fixture['batch_id'])->value('So_luong_con_lai')
        );
        $this->assertDatabaseHas('bien_dong_kho', [
            'Ma_lo_hang' => $fixture['batch_id'],
            'Loai_bien_dong' => 'Xuat_huy',
            'So_luong' => 0.25,
        ]);
    }

    private function createOrder(string $status): int
    {
        return (int) DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => 5,
            'Ma_dia_chi' => 1,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now(),
            'Tien_hang' => 50000,
            'Tong_tien' => 50000,
            'Trang_thai' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'Ma_don_hang');
    }

    private function createDelivery(int $orderId): void
    {
        DB::table('giao_hang')->insert([
            'Ma_don_hang' => $orderId,
            'Ma_nhan_vien_dieu_phoi' => $this->salesUser()->Ma_nguoi_dung,
            'Don_vi_van_chuyen' => 'Giao Hàng Nhanh',
            'Ma_van_don' => "TEST-{$orderId}",
            'Trang_thai' => 'Dang_giao',
            'Ngay_xuat_giao' => now(),
        ]);
    }

    private function createCodPayment(int $orderId): void
    {
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'So_tien' => 50000,
            'Trang_thai' => 'Khoi_tao',
        ]);
    }

    private function createAllocatedOrder(): array
    {
        $batch = DB::table('lo_hang as batch')
            ->join('lo_canh_tac as plot', 'plot.Ma_lo_canh_tac', '=', 'batch.Ma_lo_canh_tac')
            ->whereIn('batch.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('batch.So_luong_con_lai', '>', 1)
            ->whereDate('batch.Han_su_dung', '>=', now()->toDateString())
            ->orderBy('batch.Han_su_dung')
            ->first([
                'batch.Ma_lo_hang',
                'batch.So_luong_con_lai',
                'plot.Ma_san_pham',
            ]);
        $this->assertNotNull($batch);

        $orderId = $this->createOrder('Dang_giao');
        DB::table('don_hang')->where('Ma_don_hang', $orderId)->update(['So_diem_su_dung' => 10]);
        $detailId = DB::table('chi_tiet_don_hang')->insertGetId([
            'Ma_don_hang' => $orderId,
            'Ma_san_pham' => $batch->Ma_san_pham,
            'So_luong' => 0.25,
            'Don_gia' => 50000,
            'Thanh_tien' => 50000,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'Ma_ct_don_hang');
        DB::table('phan_bo_lo_hang')->insert([
            'Ma_ct_don_hang' => $detailId,
            'Ma_lo_hang' => $batch->Ma_lo_hang,
            'So_luong_xuat' => 0.25,
            'Ngay_xuat_kho' => now(),
        ]);
        DB::table('lo_hang')->where('Ma_lo_hang', $batch->Ma_lo_hang)->update([
            'So_luong_con_lai' => (float) $batch->So_luong_con_lai - 0.25,
        ]);
        $this->createDelivery($orderId);
        $this->createCodPayment($orderId);
        DB::table('diem_tich_luy')->insert([
            'Ma_nguoi_dung' => 5,
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Su_dung',
            'So_diem' => -10,
            'Mo_ta' => "Sử dụng 10 điểm cho đơn hàng #{$orderId}",
        ]);

        return [
            'order_id' => $orderId,
            'batch_id' => (int) $batch->Ma_lo_hang,
            'stock_before_dispatch' => (float) $batch->So_luong_con_lai,
            'stock_after_dispatch' => (float) $batch->So_luong_con_lai - 0.25,
        ];
    }

    private function salesUser(): NguoiDung
    {
        return NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();
    }
}
