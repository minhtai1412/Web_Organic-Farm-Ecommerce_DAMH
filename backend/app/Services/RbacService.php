<?php

namespace App\Services;

use App\Models\Quyen;
use App\Models\VaiTro;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RbacService
{
    private const RESTRICTED_FARM_PERMISSIONS = [
        'view_admin_reports',
        'view_revenue',
        'view_financial_reports',
        'view_customers',
        'manage_customers',
    ];

    private const PERMISSION_GROUPS = [
        'Quản lý tài khoản & hệ thống' => [
            'manage_users_roles',
        ],
        'Sản phẩm, mùa vụ & lô hàng' => [
            'manage_farm_season',
            'manage_farming_log',
            'manage_batch_qr',
        ],
        'Vận hành kho & hao hụt' => [
            'manage_inventory_loss',
        ],
        'Đơn hàng & chăm sóc khách hàng' => [
            'confirm_dispatch_order',
            'manage_flash_sale',
            'handle_complaints',
        ],
        'Thông tin khách hàng' => [
            'view_customers',
            'manage_customers',
        ],
        'Doanh thu & tài chính' => [
            'view_admin_reports',
            'view_revenue',
            'view_financial_reports',
        ],
        'Khách hàng' => [
            'place_order_subscription',
        ],
    ];

    public function listRoles(): array
    {
        $permissions = Quyen::query()->orderBy('Ma_quyen')->get()->keyBy('Ten_quyen');
        $groups = collect(self::PERMISSION_GROUPS)
            ->map(function (array $permissionNames, string $label) use ($permissions): array {
                return [
                    'name' => $label,
                    'permissions' => collect($permissionNames)
                        ->filter(fn (string $name) => $permissions->has($name))
                        ->map(fn (string $name): array => [
                            'name' => $name,
                            'description' => $permissions[$name]->Mo_ta,
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $group) => $group['permissions'] !== [])
            ->values()
            ->all();

        $roles = VaiTro::query()
            ->with('quyens:Ma_quyen,Ten_quyen')
            ->orderBy('Ma_vai_tro')
            ->get()
            ->map(function (VaiTro $role): array {
                $slug = strtolower($role->Ten_vai_tro) === 'farm_staff'
                    ? 'farm_staff'
                    : strtolower($role->Ten_vai_tro);

                return [
                    'id' => (int) $role->Ma_vai_tro,
                    'name' => $role->Ten_vai_tro,
                    'slug' => $slug,
                    'description' => $role->Mo_ta,
                    'permissions' => $role->quyens->pluck('Ten_quyen')->values()->all(),
                    'restricted_permissions' => $slug === 'farm_staff'
                        ? self::RESTRICTED_FARM_PERMISSIONS
                        : [],
                ];
            })
            ->all();

        return [
            'roles' => $roles,
            'permission_groups' => $groups,
        ];
    }

    public function updateRolePermissions(string $roleName, array $permissionNames): VaiTro
    {
        return DB::transaction(function () use ($roleName, $permissionNames): VaiTro {
            $role = VaiTro::query()
                ->whereRaw('LOWER(Ten_vai_tro) = ?', [strtolower($roleName)])
                ->lockForUpdate()
                ->firstOrFail();

            if (
                strtolower($role->Ten_vai_tro) === 'farm_staff'
                && array_intersect($permissionNames, self::RESTRICTED_FARM_PERMISSIONS)
            ) {
                throw ValidationException::withMessages([
                    'permissions' => [
                        'Vai trò Farm Staff không được phép cấp quyền xem doanh thu hoặc thông tin khách hàng.',
                    ],
                ]);
            }

            $permissions = Quyen::query()
                ->whereIn('Ten_quyen', $permissionNames)
                ->lockForUpdate()
                ->get();

            if ($permissions->count() !== count(array_unique($permissionNames))) {
                throw ValidationException::withMessages([
                    'permissions' => ['Danh sách quyền chứa quyền không tồn tại.'],
                ]);
            }

            $role->quyens()->sync($permissions->modelKeys());

            return $role->load('quyens:Ma_quyen,Ten_quyen');
        });
    }
}
