<?php

namespace Database\Seeders;

use App\Models\DanhMuc;
use App\Models\LoCanhTac;
use App\Models\LoHang;
use App\Models\MuaVu;
use App\Models\NguoiDung;
use App\Models\NongTrai;
use App\Models\SanPham;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class FefoTestSeeder extends Seeder
{
    public function run(): void
    {
        $sanPham = SanPham::query()
            ->where('Ten_san_pham', 'like', '%Cà chua%')
            ->first();

        if ($sanPham === null) {
            $sanPham = SanPham::query()->create([
                'Ma_danh_muc' => DanhMuc::query()->firstOrFail()->getKey(),
                'Ma_nong_trai' => NongTrai::query()->firstOrFail()->getKey(),
                'Ten_san_pham' => 'Cà chua',
                'Mo_ta' => 'Sản phẩm dùng để kiểm thử phân bổ tồn kho FEFO.',
                'Don_vi_tinh' => 'kg',
                'Gia_ban' => 45000,
                'Hinh_anh_dai_dien' => '/uploads/products/ca_chua_fefo.jpg',
                'Ty_le_tich_diem' => 0,
                'Trang_thai' => 'Dang_ban',
            ]);
        }

        $loCanhTac = $sanPham->loCanhTacs()->first();
        if ($loCanhTac === null) {
            $loCanhTac = LoCanhTac::query()->create([
                'Ma_mua_vu' => MuaVu::query()->firstOrFail()->getKey(),
                'Ma_san_pham' => $sanPham->getKey(),
                'Ten_lo' => 'Lô canh tác kiểm thử FEFO',
                'Dien_tich' => null,
                'Ngay_gieo_trong' => Carbon::now()->subDays(30)->toDateString(),
                'Trang_thai' => 'Dang_canh_tac',
            ]);
        }

        $maNhanVien = NguoiDung::query()->firstOrFail()->getKey();
        $foreignKeys = [
            'Ma_lo_canh_tac' => $loCanhTac->getKey(),
            'Ma_nhan_vien_phu_trach' => $maNhanVien,
        ];

        LoHang::factory()->sapHetHan()->create($foreignKeys);

        LoHang::factory()->conHan()->create(array_merge($foreignKeys, [
            'Han_su_dung' => Carbon::now()->addDays(4)->toDateString(),
            'So_luong_con_lai' => 7,
        ]));

        LoHang::factory()->daQuaHan()->create($foreignKeys);
        LoHang::factory()->hetTonKho()->create($foreignKeys);

        foreach ([10, 15, 20] as $daysUntilExpiry) {
            LoHang::factory()->conHan()->create(array_merge($foreignKeys, [
                'Han_su_dung' => Carbon::now()->addDays($daysUntilExpiry)->toDateString(),
            ]));
        }
    }
}
