<?php

/*
 * Luồng quản trị: quản lý tài khoản và phân quyền người dùng (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserRoleController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $paginator = NguoiDung::query()
            ->with('vaiTro:Ma_vai_tro,Ten_vai_tro')
            ->orderBy('Ma_nguoi_dung')
            ->paginate($perPage);

        $items = collect($paginator->items())->map(fn (NguoiDung $user): array => [
            'id' => (int) $user->Ma_nguoi_dung,
            'name' => $user->Ho_ten,
            'email' => $user->Email,
            'phone' => $user->So_dien_thoai,
            'role_id' => (int) $user->Ma_vai_tro,
            'role' => $user->vaiTro?->Ten_vai_tro,
            'status' => $user->Trang_thai,
            'created_at' => $user->created_at,
        ])->all();

        return $this->paginatedResponse(
            $paginator,
            'Lấy danh sách người dùng thành công.',
            $items
        );
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Hoat_dong,Khoa'],
        ], [
            'status.required' => 'Vui lòng chọn trạng thái tài khoản.',
            'status.in' => 'Trạng thái tài khoản không hợp lệ.',
        ]);

        $user = NguoiDung::query()->findOrFail($id);

        if ((int) $user->Ma_nguoi_dung === 1) {
            return $this->errorResponse(
                message: 'Không thể khóa tài khoản quản trị viên cao nhất.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        $user->Trang_thai = $validated['status'];
        $user->save();

        return $this->successResponse(
            message: 'Cập nhật trạng thái tài khoản thành công.',
            data: [
                'id' => (int) $user->Ma_nguoi_dung,
                'status' => $user->Trang_thai,
            ]
        );
    }
}
