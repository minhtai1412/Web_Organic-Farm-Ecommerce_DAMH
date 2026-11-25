<?php

/*
 * Luồng quản trị: cấu hình tham số hệ thống nông sản (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CauHinhHeThong;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSettingController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách khóa cấu hình hệ thống cho phép Admin quản lý.
     */
    private const MANAGED_SETTINGS = [
        'delivery_max_distance_km' => [
            'default' => '25',
            'description' => 'Khoảng cách giao hàng tối đa tính bằng kilômét',
        ],
        'fefo_warning_days' => [
            'default' => '3',
            'description' => 'Số ngày cảnh báo hàng hóa trước khi hết hạn',
        ],
        'don_gia_ship_km' => [
            'default' => '2000',
            'description' => 'Đơn giá phí giao hàng tính trên mỗi kilômét (VNĐ/km)',
        ],
        'diem_quy_doi_vnd' => [
            'default' => '1000',
            'description' => 'Số tiền giảm tương ứng với một điểm thưởng Loyalty (VNĐ/điểm)',
        ],
    ];

    /**
     * Lấy toàn bộ tham số cấu hình hệ thống hiện hành.
     */
    public function index(): JsonResponse
    {
        $this->ensureDefaultSettingsExist();

        $rows = CauHinhHeThong::query()
            ->whereIn('Khoa', array_keys(self::MANAGED_SETTINGS))
            ->get()
            ->keyBy('Khoa');

        $settings = [];
        foreach (self::MANAGED_SETTINGS as $key => $meta) {
            $record = $rows->get($key);
            $settings[$key] = [
                'key'         => $key,
                'value'       => $record ? (string) $record->Gia_tri : $meta['default'],
                'description' => $record?->Mo_ta ?: $meta['description'],
            ];
        }

        return $this->successResponse(
            message: 'Lấy cấu hình hệ thống thành công.',
            data: [
                'delivery_max_distance_km' => (float) $settings['delivery_max_distance_km']['value'],
                'fefo_warning_days' => (int) $settings['fefo_warning_days']['value'],
                'don_gia_ship_km'  => (float) $settings['don_gia_ship_km']['value'],
                'diem_quy_doi_vnd' => (int) $settings['diem_quy_doi_vnd']['value'],
                'items'            => array_values($settings),
            ]
        );
    }

    /**
     * Cập nhật cấu hình đơn giá giao hàng/km và tỷ lệ quy đổi điểm thưởng.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'delivery_max_distance_km' => ['sometimes', 'numeric', 'min:1', 'max:1000'],
            'fefo_warning_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'don_gia_ship_km'  => ['sometimes', 'numeric', 'min:1', 'max:10000000'],
            'diem_quy_doi_vnd' => ['sometimes', 'integer', 'min:1', 'max:10000000'],
        ], [
            'don_gia_ship_km.required'  => 'Vui lòng nhập đơn giá giao hàng trên mỗi km.',
            'don_gia_ship_km.numeric'   => 'Đơn giá giao hàng phải là số hợp lệ.',
            'don_gia_ship_km.min'       => 'Đơn giá giao hàng phải lớn hơn 0đ.',
            'diem_quy_doi_vnd.required' => 'Vui lòng nhập giá trị quy đổi 1 điểm thưởng.',
            'diem_quy_doi_vnd.integer'  => 'Giá trị quy đổi điểm phải là số nguyên.',
            'diem_quy_doi_vnd.min'      => 'Giá trị quy đổi 1 điểm phải lớn hơn 0đ.',
        ]);

        $this->ensureDefaultSettingsExist();

        DB::transaction(function () use ($validated): void {
            if (array_key_exists('delivery_max_distance_km', $validated)) {
                CauHinhHeThong::query()->updateOrCreate(
                    ['Khoa' => 'delivery_max_distance_km'],
                    ['Gia_tri' => (string) (float) $validated['delivery_max_distance_km']]
                );
            }
            if (array_key_exists('fefo_warning_days', $validated)) {
                CauHinhHeThong::query()->updateOrCreate(
                    ['Khoa' => 'fefo_warning_days'],
                    ['Gia_tri' => (string) (int) $validated['fefo_warning_days']]
                );
            }
            if (array_key_exists('don_gia_ship_km', $validated)) {
                CauHinhHeThong::query()->updateOrCreate(
                    ['Khoa' => 'don_gia_ship_km'],
                    [
                        'Gia_tri' => (string) (float) $validated['don_gia_ship_km'],
                        'Mo_ta'   => self::MANAGED_SETTINGS['don_gia_ship_km']['description'],
                    ]
                );
            }

            if (array_key_exists('diem_quy_doi_vnd', $validated)) {
                CauHinhHeThong::query()->updateOrCreate(
                    ['Khoa' => 'diem_quy_doi_vnd'],
                    [
                        'Gia_tri' => (string) (int) $validated['diem_quy_doi_vnd'],
                        'Mo_ta'   => self::MANAGED_SETTINGS['diem_quy_doi_vnd']['description'],
                    ]
                );
            }
        });

        $rows = CauHinhHeThong::query()
            ->whereIn('Khoa', array_keys(self::MANAGED_SETTINGS))
            ->pluck('Gia_tri', 'Khoa');

        return $this->successResponse(
            message: 'Cập nhật cấu hình hệ thống thành công.',
            data: [
                'delivery_max_distance_km' => (float) ($rows->get('delivery_max_distance_km', '25')),
                'fefo_warning_days' => (int) ($rows->get('fefo_warning_days', '3')),
                'don_gia_ship_km'  => (float) ($rows->get('don_gia_ship_km', '2000')),
                'diem_quy_doi_vnd' => (int) ($rows->get('diem_quy_doi_vnd', '1000')),
            ]
        );
    }

    private function ensureDefaultSettingsExist(): void
    {
        foreach (self::MANAGED_SETTINGS as $key => $meta) {
            DB::table('cau_hinh_he_thong')->insertOrIgnore([
                'Khoa'    => $key,
                'Gia_tri' => $meta['default'],
                'Mo_ta'   => $meta['description'],
            ]);
        }
    }
}