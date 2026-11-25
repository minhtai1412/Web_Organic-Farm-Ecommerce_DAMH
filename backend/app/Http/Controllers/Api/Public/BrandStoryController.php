<?php

/*
 * Luồng công khai: câu chuyện thương hiệu, triết lý canh tác, chứng nhận và hồ sơ nông trại.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CauHinhHeThong;
use App\Models\ChungNhan;
use App\Models\KetQuaKiemDinh;
use App\Models\NongTrai;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class BrandStoryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/brand-story
     * Đọc trực tiếp hồ sơ nông trại và các dữ liệu liên quan từ cơ sở dữ liệu.
     */
    public function show(): JsonResponse
    {
        $farmRecords = NongTrai::query()
            ->select([
                'Ma_nong_trai',
                'Ten_nong_trai',
                'Dia_chi',
                'Vi_do',
                'Kinh_do',
                'Cau_chuyen_thuong_hieu',
                'Triet_ly_canh_tac',
                'Ho_so_nang_luc',
            ])
            ->with([
                'hinhAnhs' => fn ($query) => $query->select([
                    'Ma_hinh_anh',
                    'Ma_nong_trai',
                    'Duong_dan',
                    'Mo_ta',
                ]),
                'ketQuaKiemDinhs' => fn ($query) => $query
                    ->select([
                        'Ma_kiem_dinh',
                        'Ma_nong_trai',
                        'Loai_mau',
                        'Ngay_kiem_dinh',
                        'Ket_qua',
                        'Tep_scan',
                        'Ghi_chu',
                    ])
                    ->orderByDesc('Ngay_kiem_dinh')
                    ->orderByDesc('Ma_kiem_dinh'),
            ])
            ->orderBy('Ma_nong_trai')
            ->get();

        $farmIds = $farmRecords->pluck('Ma_nong_trai');

        $farms = $farmRecords->map(fn (NongTrai $farm): array => [
            'id' => (int) $farm->Ma_nong_trai,
            'name' => $farm->Ten_nong_trai,
            'address' => $farm->Dia_chi,
            'latitude' => (float) $farm->Vi_do,
            'longitude' => (float) $farm->Kinh_do,
            'brand_story' => $farm->Cau_chuyen_thuong_hieu,
            'farming_philosophy' => $farm->Triet_ly_canh_tac,
            'capacity_profile' => $farm->Ho_so_nang_luc,
            'images' => $farm->hinhAnhs->map(fn ($image, $index): array => [
                'id' => (int) $image->Ma_hinh_anh,
                'url' => $this->publicFileUrl($image->Duong_dan),
                'caption' => $image->Mo_ta,
                'is_cover' => $index === 0,
            ])->values()->all(),
            'quality_tests' => $farm->ketQuaKiemDinhs->map(fn (KetQuaKiemDinh $test): array => [
                'id' => (int) $test->Ma_kiem_dinh,
                'sample_type' => $test->Loai_mau,
                'inspected_at' => $test->Ngay_kiem_dinh,
                'result' => $test->Ket_qua,
                'file_path' => $test->Tep_scan,
                'file_url' => $this->publicFileUrl($test->Tep_scan),
                'note' => $test->Ghi_chu,
            ])->values()->all(),
        ])->values();

        $cultivationProcess = $farmRecords->map(fn (NongTrai $farm): array => [
            'farm_id' => (int) $farm->Ma_nong_trai,
            'farm_name' => $farm->Ten_nong_trai,
            'description' => $farm->Triet_ly_canh_tac,
        ])->values()->all();

        $certificateRecords = collect();
        if ($farmIds->isNotEmpty()) {
            $certificateRecords = ChungNhan::query()
                ->select([
                    'Ma_chung_nhan',
                    'Ma_lo_hang',
                    'Ma_san_pham',
                    'Ten_chung_nhan',
                    'To_chuc_cap',
                    'Ngay_cap',
                    'Ngay_het_han',
                    'Duong_dan_tep',
                ])
                ->where(function ($query): void {
                    $query->whereNull('Ngay_het_han')
                        ->orWhereDate('Ngay_het_han', '>=', now('Asia/Ho_Chi_Minh')->toDateString());
                })
                ->where(function ($query) use ($farmIds): void {
                    $query->whereHas('sanPham', fn ($productQuery) => $productQuery
                        ->whereIn('Ma_nong_trai', $farmIds))
                        ->orWhereHas('loHang.loCanhTac.muaVu', fn ($seasonQuery) => $seasonQuery
                            ->whereIn('Ma_nong_trai', $farmIds));
                })
                ->with([
                    'sanPham:Ma_san_pham,Ma_nong_trai,Ten_san_pham',
                    'loHang:Ma_lo_hang,Ma_lo_canh_tac',
                    'loHang.loCanhTac:Ma_lo_canh_tac,Ma_mua_vu,Ma_san_pham',
                    'loHang.loCanhTac.muaVu:Ma_mua_vu,Ma_nong_trai',
                    'loHang.loCanhTac.sanPham:Ma_san_pham,Ma_nong_trai,Ten_san_pham',
                ])
                ->orderBy('Ma_chung_nhan')
                ->get();
        }

        $certificationDetails = $certificateRecords->map(function (ChungNhan $certificate): array {
            $name = (string) $certificate->Ten_chung_nhan;
            $lowerName = mb_strtolower($name);

            $standard = match (true) {
                str_contains($lowerName, 'vietgap') => 'VietGAP',
                str_contains($lowerName, 'globalgap') => 'GlobalGAP',
                str_contains($lowerName, 'hữu cơ'),
                str_contains($lowerName, 'organic'),
                str_contains($lowerName, '11041') => 'Hữu cơ TCVN 11041',
                default => $name,
            };

            $product = $certificate->sanPham ?? $certificate->loHang?->loCanhTac?->sanPham;
            $farmId = $certificate->sanPham?->Ma_nong_trai
                ?? $certificate->loHang?->loCanhTac?->muaVu?->Ma_nong_trai
                ?? $product?->Ma_nong_trai;

            return [
                'id' => (int) $certificate->Ma_chung_nhan,
                'farm_id' => $farmId === null ? null : (int) $farmId,
                'name' => $name,
                'standard' => $standard,
                'issuer' => $certificate->To_chuc_cap,
                'issued_date' => $certificate->Ngay_cap,
                'expiry_date' => $certificate->Ngay_het_han,
                'product_name' => $product?->Ten_san_pham,
                'file_path' => $certificate->Duong_dan_tep,
                'file_url' => $this->publicFileUrl($certificate->Duong_dan_tep),
            ];
        })->values();

        $settings = CauHinhHeThong::query()
            ->whereIn('Khoa', ['hotline_cskh', 'gio_lam_viec', 'email_lien_he'])
            ->get(['Khoa', 'Gia_tri'])
            ->pluck('Gia_tri', 'Khoa');

        return $this->successResponse(
            message: 'Lấy thông tin nông trại và thương hiệu thành công.',
            data: [
                'farms' => $farms->all(),
                'cultivation_process' => $cultivationProcess,
                'certifications' => $certificationDetails
                    ->pluck('standard')
                    ->unique()
                    ->values()
                    ->all(),
                'certification_details' => $certificationDetails->all(),
                'contact' => [
                    'hotline' => $settings->get('hotline_cskh'),
                    'working_hours' => $settings->get('gio_lam_viec'),
                    'email' => $settings->get('email_lien_he'),
                ],
            ]
        );
    }

    private function publicFileUrl(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $path)) {
            return $path;
        }

        $normalizedPath = ltrim($path, '/');

        if (str_starts_with($normalizedPath, 'uploads/')) {
            return url('/' . $normalizedPath);
        }

        $r2BaseUrl = rtrim((string) config('filesystems.disks.r2.url', ''), '/');
        if ($r2BaseUrl !== '') {
            return $r2BaseUrl . '/' . $normalizedPath;
        }

        try {
            return Storage::disk('r2')->url($normalizedPath);
        } catch (\Throwable) {
            return url('/' . $normalizedPath);
        }
    }
}