<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\RbacService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRbacController extends Controller
{
    use ApiResponse;

    public function index(RbacService $rbac): JsonResponse
    {
        return $this->successResponse('Lấy cấu hình vai trò và quyền thành công.', $rbac->listRoles());
    }

    public function update(string $role, Request $request, RbacService $rbac): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['required', 'string', 'distinct', 'exists:quyen,Ten_quyen'],
        ], [
            'permissions.present' => 'Vui lòng gửi danh sách quyền cần áp dụng.',
            'permissions.array' => 'Danh sách quyền không hợp lệ.',
            'permissions.*.distinct' => 'Danh sách quyền không được chứa giá trị trùng lặp.',
            'permissions.*.exists' => 'Danh sách quyền có quyền không tồn tại.',
        ]);

        $updatedRole = $rbac->updateRolePermissions($role, $validated['permissions']);

        return $this->successResponse('Đã lưu cấu hình phân quyền cho vai trò.', [
            'role_id' => (int) $updatedRole->Ma_vai_tro,
            'role' => $updatedRole->Ten_vai_tro,
            'permissions' => $updatedRole->quyens->pluck('Ten_quyen')->values()->all(),
        ]);
    }
}
