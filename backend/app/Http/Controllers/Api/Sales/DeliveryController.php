<?php

/*
 * Luồng bán hàng: điều phối giao hàng và cập nhật trạng thái vận chuyển.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\BienDongKho;
use App\Models\DiemTichLuy;
use App\Models\DonHang;
use App\Models\GiaoHang;
use App\Models\LoHang;
use App\Models\ThanhToan;
use App\Services\RewardPointService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryController extends Controller
{
    use ApiResponse;

    public function dispatch(int $orderId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'don_vi_van_chuyen' => ['required', 'string', 'max:100'],
            'ma_van_don' => ['required', 'string', 'max:100', 'unique:giao_hang,Ma_van_don'],
            'ghi_chu' => ['nullable', 'string', 'max:500'],
        ], [
            'don_vi_van_chuyen.required' => 'Vui lòng chọn hoặc nhập đơn vị vận chuyển.',
            'don_vi_van_chuyen.max' => 'Tên đơn vị vận chuyển không được vượt quá 100 ký tự.',
            'ma_van_don.required' => 'Vui lòng nhập mã vận đơn.',
            'ma_van_don.unique' => 'Mã vận đơn này đã được sử dụng cho đơn hàng khác.',
            'ma_van_don.max' => 'Mã vận đơn không được vượt quá 100 ký tự.',
            'ghi_chu.max' => 'Ghi chú điều phối không được vượt quá 500 ký tự.',
        ]);

        $order = DB::transaction(function () use ($orderId, $request, $validated): DonHang {
            $order = DonHang::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
            if ($order->Trang_thai !== 'Da_xac_nhan') {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ có thể điều phối đơn hàng đang ở trạng thái đã xác nhận.',
                ]);
            }

            $delivery = GiaoHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->first();

            if ($delivery && $delivery->Trang_thai !== 'Chuan_bi') {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng này đã được điều phối giao nhận.',
                ]);
            }

            $values = [
                'Ma_nhan_vien_dieu_phoi' => (int) $request->user()->getAuthIdentifier(),
                'Don_vi_van_chuyen' => $validated['don_vi_van_chuyen'],
                'Ma_van_don' => $validated['ma_van_don'],
                'Trang_thai' => 'Dang_giao',
                'Ngay_xuat_giao' => now(),
                'Ghi_chu_dieu_phoi' => $validated['ghi_chu'] ?? null,
            ];

            if ($delivery) {
                $delivery->update($values);
            } else {
                $values['Ma_don_hang'] = $order->Ma_don_hang;
                GiaoHang::query()->create($values);
            }

            $order->update(['Trang_thai' => 'Dang_giao']);

            return $order->refresh();
        });

        return $this->successResponse(
            'Đã điều phối giao hàng thành công.',
            ['order_id' => (int) $order->Ma_don_hang, 'status' => $order->Trang_thai]
        );
    }

    public function markDelivered(
        int $orderId,
        Request $request,
        RewardPointService $rewards
    ): JsonResponse {
        $validated = $request->validate([
            'cod_collected' => ['nullable', 'boolean'],
        ], [
            'cod_collected.boolean' => 'Xác nhận thu tiền COD không hợp lệ.',
        ]);

        $result = DB::transaction(function () use ($orderId, $validated, $rewards): array {
            $candidate = DonHang::query()->whereKey($orderId)->firstOrFail();
            $rewards->lockCustomer((int) $candidate->Ma_nguoi_dung);

            $order = DonHang::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
            if ($order->Trang_thai !== 'Dang_giao') {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ có thể xác nhận giao thành công cho đơn hàng đang giao.',
                ]);
            }

            $delivery = GiaoHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->first();

            if (! $delivery || $delivery->Trang_thai !== 'Dang_giao') {
                throw ValidationException::withMessages([
                    'order_id' => 'Không tìm thấy thông tin vận đơn đang giao của đơn hàng.',
                ]);
            }

            $payments = ThanhToan::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->get();
            $codPayment = $payments->first(
                fn (ThanhToan $payment): bool => $payment->Phuong_thuc === 'COD'
            );

            if (
                $codPayment
                && ! in_array($codPayment->Trang_thai, ['Khoi_tao', 'Cho_thanh_toan', 'Thanh_cong'], true)
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'Trạng thái thanh toán COD không thể hoàn tất cho đơn hàng này.',
                ]);
            }

            if (
                $codPayment
                && in_array($codPayment->Trang_thai, ['Khoi_tao', 'Cho_thanh_toan'], true)
                && ! ($validated['cod_collected'] ?? false)
            ) {
                throw ValidationException::withMessages([
                    'cod_collected' => 'Vui lòng xác nhận đã thu đủ tiền COD trước khi hoàn tất đơn hàng.',
                ]);
            }

            if (
                $codPayment
                && in_array($codPayment->Trang_thai, ['Khoi_tao', 'Cho_thanh_toan'], true)
            ) {
                $codPayment->update([
                    'Trang_thai' => 'Thanh_cong',
                    'Thoi_gian_thanh_toan' => now(),
                ]);
            } elseif (! $codPayment && ! $payments->contains(
                fn (ThanhToan $payment): bool => $payment->Trang_thai === 'Thanh_cong'
            )) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng chưa có khoản thanh toán thành công.',
                ]);
            }

            $delivery->update([
                'Trang_thai' => 'Giao_thanh_cong',
                'Ngay_giao_thanh_cong' => now(),
            ]);
            $order->update(['Trang_thai' => 'Hoan_thanh']);

            $pointsEarned = $this->awardOrderPoints($order, $rewards);

            return [
                'order' => $order->refresh(),
                'delivered_at' => $delivery->fresh()->Ngay_giao_thanh_cong,
                'points_earned' => $pointsEarned,
            ];
        });

        return $this->successResponse(
            'Đã xác nhận giao hàng thành công và cập nhật điểm thưởng.',
            [
                'order_id' => (int) $result['order']->Ma_don_hang,
                'status' => $result['order']->Trang_thai,
                'delivered_at' => $result['delivered_at'],
                'points_earned' => $result['points_earned'],
            ]
        );
    }

    public function markFailed(int $orderId, Request $request, RewardPointService $rewards): JsonResponse
    {
        $validated = $request->validate([
            'ly_do_that_bai' => ['required', 'string', 'max:500'],
            'tinh_trang_hang_hoan' => ['required', 'in:con_tuoi,hu_hong'],
        ], [
            'ly_do_that_bai.required' => 'Vui lòng nhập lý do giao hàng thất bại.',
            'ly_do_that_bai.max' => 'Lý do giao thất bại không được vượt quá 500 ký tự.',
            'tinh_trang_hang_hoan.required' => 'Vui lòng chọn tình trạng hàng hoàn về.',
            'tinh_trang_hang_hoan.in' => 'Tình trạng hàng hoàn về không hợp lệ.',
        ]);

        $result = DB::transaction(function () use ($orderId, $validated, $rewards): array {
            $candidate = DonHang::query()->whereKey($orderId)->firstOrFail();
            $rewards->lockCustomer((int) $candidate->Ma_nguoi_dung);

            $order = DonHang::query()->whereKey($orderId)->lockForUpdate()->firstOrFail();
            if ($order->Trang_thai !== 'Dang_giao') {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ có thể ghi nhận giao thất bại cho đơn hàng đang giao.',
                ]);
            }

            $delivery = GiaoHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->first();

            if (! $delivery || $delivery->Trang_thai !== 'Dang_giao') {
                throw ValidationException::withMessages([
                    'order_id' => 'Không tìm thấy thông tin vận đơn đang giao của đơn hàng.',
                ]);
            }

            $payments = ThanhToan::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->get();
            $delivery->update([
                'Trang_thai' => 'Giao_that_bai',
                'Ly_do_that_bai' => $validated['ly_do_that_bai'],
            ]);
            $order->update(['Trang_thai' => 'Da_huy']);

            foreach ($payments as $payment) {
                if (
                    $payment->Phuong_thuc === 'COD'
                    && in_array($payment->Trang_thai, ['Khoi_tao', 'Cho_thanh_toan'], true)
                ) {
                    $payment->update(['Trang_thai' => 'That_bai']);
                }
            }

            $this->recordReturnedInventory(
                $order,
                (int) $candidate->Ma_nguoi_dung,
                $validated['ly_do_that_bai'],
                $validated['tinh_trang_hang_hoan']
            );

            $pointsRefunded = $rewards->refundOrderPoints($order->refresh());

            return [
                'order' => $order->refresh(),
                'points_refunded' => $pointsRefunded,
            ];
        });

        return $this->successResponse(
            'Đã ghi nhận giao hàng thất bại, cập nhật tồn kho và xử lý điểm thưởng.',
            [
                'order_id' => (int) $result['order']->Ma_don_hang,
                'status' => $result['order']->Trang_thai,
                'delivery_status' => 'Giao_that_bai',
                'points_refunded' => $result['points_refunded'],
            ]
        );
    }

    private function awardOrderPoints(DonHang $order, RewardPointService $rewards): int
    {
        $existingAward = DiemTichLuy::query()
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Loai_giao_dich', 'Tich_diem')
            ->lockForUpdate()
            ->exists();

        if ($existingAward) {
            return 0;
        }

        $points = (int) floor(max(0, (float) $order->Tong_tien) / $rewards->conversionRate());
        if ($points <= 0) {
            return 0;
        }

        DiemTichLuy::query()->create([
            'Ma_nguoi_dung' => $order->Ma_nguoi_dung,
            'Ma_don_hang' => $order->Ma_don_hang,
            'Loai_giao_dich' => 'Tich_diem',
            'So_diem' => $points,
            'Mo_ta' => "Tích {$points} điểm cho đơn hàng #{$order->Ma_don_hang}",
        ]);

        return $points;
    }

    private function recordReturnedInventory(
        DonHang $order,
        int $staffId,
        string $reason,
        string $condition
    ): void {
        $allocations = DB::table('phan_bo_lo_hang as allocation')
            ->join(
                'chi_tiet_don_hang as detail',
                'detail.Ma_ct_don_hang',
                '=',
                'allocation.Ma_ct_don_hang'
            )
            ->where('detail.Ma_don_hang', $order->Ma_don_hang)
            ->lockForUpdate()
            ->get(['allocation.Ma_lo_hang', 'allocation.So_luong_xuat'])
            ->groupBy('Ma_lo_hang');

        foreach ($allocations as $batchId => $items) {
            $batch = LoHang::query()->whereKey($batchId)->lockForUpdate()->first();
            if (! $batch) {
                continue;
            }

            $quantity = round((float) $items->sum('So_luong_xuat'), 2);
            $canRestock = $condition === 'con_tuoi'
                && $batch->Trang_thai !== 'Da_huy'
                && $batch->Han_su_dung >= now()->toDateString();

            if ($canRestock) {
                $batch->So_luong_con_lai = round((float) $batch->So_luong_con_lai + $quantity, 2);
                if ($batch->Trang_thai === 'Het_hang') {
                    $batch->Trang_thai = 'Con_hang';
                }
                $batch->save();
            }

            BienDongKho::query()->create([
                'Ma_lo_hang' => $batch->Ma_lo_hang,
                'Ma_nhan_vien' => $staffId,
                'Loai_bien_dong' => $canRestock ? 'Nhap_hoan' : 'Xuat_huy',
                'So_luong' => $quantity,
                'Ly_do' => $canRestock
                    ? "Hoàn kho từ đơn #{$order->Ma_don_hang} giao thất bại: {$reason}"
                    : "Xuất hủy hàng hoàn từ đơn #{$order->Ma_don_hang}: {$reason}",
                'Ngay_ghi_nhan' => now(),
            ]);
        }
    }
}
