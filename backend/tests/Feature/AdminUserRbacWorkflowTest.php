<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Models\VaiTro;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AdminUserRbacWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_admin_can_search_filter_and_paginate_users_with_role_statistics(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/users?search=Sales&role=Sales&status=active&per_page=5')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.users.0.email', 'sales.ha@nongsansach.vn')
            ->assertJsonPath('data.users.0.role.name', 'Sales')
            ->assertJsonPath('data.users.0.status', 'Hoat_dong')
            ->assertJsonPath('data.stats.total', 6)
            ->assertJsonPath('data.stats.staff', 4)
            ->assertJsonPath('data.stats.customers', 2)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonMissingPath('data.users.0.password')
            ->assertJsonMissingPath('data.users.0.Mat_khau_ma_hoa');
    }

    public function test_admin_can_create_staff_with_a_hashed_password_and_safe_response(): void
    {
        $admin = $this->admin();
        $farmRole = VaiTro::query()->where('Ten_vai_tro', 'Farm_Staff')->firstOrFail();
        $salesRole = VaiTro::query()->where('Ten_vai_tro', 'Sales')->firstOrFail();

        foreach ([
            [$farmRole, 'farm.new@example.test', '0901111222'],
            [$salesRole, 'sales.new@example.test', '0901111333'],
        ] as [$role, $email, $phone]) {
            $response = $this->actingAs($admin, 'sanctum')
                ->postJson('/api/admin/users/staff', [
                    'ho_ten' => 'Nhân viên mới',
                    'email' => $email,
                    'so_dien_thoai' => $phone,
                    'mat_khau' => 'SecurePass123',
                    'vai_tro' => $role->Ma_vai_tro,
                ])
                ->assertCreated()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.role.name', $role->Ten_vai_tro)
                ->assertJsonMissingPath('data.password')
                ->assertJsonMissingPath('data.Mat_khau_ma_hoa');

            $user = NguoiDung::query()->where('Email', $email)->firstOrFail();
            $this->assertTrue(Hash::check('SecurePass123', $user->Mat_khau_ma_hoa));
            $this->assertSame('Hoat_dong', $user->Trang_thai);
        }
    }

    public function test_admin_can_update_user_profile_role_and_password(): void
    {
        $staff = NguoiDung::query()->findOrFail(3);
        $salesRole = VaiTro::query()->where('Ten_vai_tro', 'Sales')->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson("/api/admin/users/{$staff->Ma_nguoi_dung}", [
                'ho_ten' => 'Nhân viên đã cập nhật',
                'email' => 'farm.updated@example.test',
                'so_dien_thoai' => '0902222333',
                'mat_khau' => 'NewPassword123',
                'vai_tro' => $salesRole->Ma_vai_tro,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nhân viên đã cập nhật')
            ->assertJsonPath('data.role.name', 'Sales')
            ->assertJsonMissingPath('data.Mat_khau_ma_hoa');

        $staff->refresh();
        $this->assertTrue(Hash::check('NewPassword123', $staff->Mat_khau_ma_hoa));
        $this->assertSame('0902222333', $staff->So_dien_thoai);
    }

    public function test_locking_revokes_all_tokens_blocks_login_and_can_be_reversed(): void
    {
        $staff = NguoiDung::query()->findOrFail(2);
        $staff->createToken('web')->plainTextToken;
        $staff->createToken('mobile')->plainTextToken;
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$staff->Ma_nguoi_dung}/toggle-status", [
                'ly_do_khoa' => 'Tạm khóa để rà soát hoạt động tài khoản.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Khoa')
            ->assertJsonPath('data.lock_reason', 'Tạm khóa để rà soát hoạt động tài khoản.');

        $this->assertSame(0, $staff->tokens()->count());
        $this->postJson('/api/login', [
            'email' => $staff->Email,
            'password' => 'password',
        ])->assertForbidden()
            ->assertJsonPath('success', false);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$staff->Ma_nguoi_dung}/toggle-status", [])
            ->assertOk()
            ->assertJsonPath('data.status', 'Hoat_dong')
            ->assertJsonPath('data.lock_reason', null);

        $this->postJson('/api/login', [
            'email' => $staff->Email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_admin_cannot_lock_or_demote_themselves(): void
    {
        $admin = $this->admin();
        $salesRole = VaiTro::query()->where('Ten_vai_tro', 'Sales')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$admin->Ma_nguoi_dung}/toggle-status", [
                'ly_do_khoa' => 'Kiểm thử tự khóa.',
            ])
            ->assertUnprocessable();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$admin->Ma_nguoi_dung}", [
                'vai_tro' => $salesRole->Ma_vai_tro,
            ])
            ->assertUnprocessable();
    }

    public function test_rbac_allows_sales_rights_but_denies_restricted_permissions_to_farm_staff(): void
    {
        $farmRole = VaiTro::query()->where('Ten_vai_tro', 'Farm_Staff')->firstOrFail();
        $salesRole = VaiTro::query()->where('Ten_vai_tro', 'Sales')->firstOrFail();
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$salesRole->Ten_vai_tro}/permissions", [
                'permissions' => ['handle_complaints', 'view_customers'],
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'Sales');

        $roleResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/roles')->assertOk();
        $farmRoleData = collect($roleResponse->json('data.roles'))
            ->firstWhere('slug', 'farm_staff');
        $this->assertContains('view_revenue', $farmRoleData['restricted_permissions']);
        $this->assertNotContains('view_revenue', $farmRoleData['permissions']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$farmRole->Ten_vai_tro}/permissions", [
                'permissions' => ['manage_inventory_loss', 'view_revenue'],
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.permissions.0',
                'Vai trò Farm Staff không được phép cấp quyền xem doanh thu hoặc thông tin khách hàng.'
            );

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/roles/{$farmRole->Ten_vai_tro}/permissions", [
                'permissions' => ['manage_inventory_loss', 'manage_customers'],
            ])
            ->assertUnprocessable();

        $farm = NguoiDung::query()->findOrFail(3);
        $farm->vaiTro()->first()->quyens()->syncWithoutDetaching([
            \App\Models\Quyen::query()->where('Ten_quyen', 'view_admin_reports')->value('Ma_quyen'),
        ]);
        $this->assertFalse($farm->fresh()->hasPermission('view_admin_reports'));

        Route::middleware(['auth:sanctum', 'permission:view_admin_reports'])
            ->get('/api/test/rbac/revenue', fn () => response()->json(['success' => true]));
        $this->actingAs($farm, 'sanctum')
            ->getJson('/api/test/rbac/revenue')
            ->assertForbidden();

        $this->actingAs($farm, 'sanctum')
            ->getJson('/api/admin/reports/dashboard')
            ->assertForbidden();

        $this->actingAs($farm, 'sanctum')
            ->getJson('/api/customer/addresses')
            ->assertForbidden();
    }

    public function test_non_admin_cannot_access_admin_account_management(): void
    {
        $sales = NguoiDung::query()->findOrFail(2);

        $this->actingAs($sales, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    private function admin(): NguoiDung
    {
        return NguoiDung::query()->where('Email', 'admin@nongsansach.vn')->firstOrFail();
    }
}
