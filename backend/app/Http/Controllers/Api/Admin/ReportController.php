<?php

/*
 * Luồng quản trị: báo cáo doanh thu, đơn hàng, tỷ lệ canh tác và chỉ số hiệu năng hệ thống (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\LoCanhTac;
use App\Models\MuaVu;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    use ApiResponse;

    public function dashboard(): JsonResponse
    {
        $startedAt = microtime(true);

        $orders = DonHang::query();
        $ordersByStatus = (clone $orders)
            ->selectRaw('Trang_thai, COUNT(*) AS total')
            ->groupBy('Trang_thai')
            ->pluck('total', 'Trang_thai')
            ->all();

        $activeSeasonCount = MuaVu::query()
            ->where('Trang_thai', 'Dang_dien_ra')
            ->count();

        $totalPlots = LoCanhTac::query()->count();
        $activePlots = LoCanhTac::query()
            ->where('Trang_thai', 'Dang_canh_tac')
            ->count();

        $totalUsers = NguoiDung::query()->count();
        $activeUsers = NguoiDung::query()
            ->where('Trang_thai', 'Hoat_dong')
            ->count();

        DB::select('SELECT 1');

        return $this->successResponse(
            message: 'Lấy dữ liệu báo cáo quản trị thành công.',
            data: [
                'revenue' => [
                    'total' => (float) (clone $orders)->sum('Tong_tien'),
                    'orders_count' => (clone $orders)->count(),
                    'orders_by_status' => $ordersByStatus,
                ],
                'farm' => [
                    'active_seasons' => $activeSeasonCount,
                    'total_plots' => $totalPlots,
                    'active_plots' => $activePlots,
                ],
                'users' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                ],
                'system_health' => [
                    'api_response_ms' => (int) round((microtime(true) - $startedAt) * 1000),
                    'db_connection' => 'connected',
                    'status' => 'healthy',
                ],
            ]
        );
    }
}
