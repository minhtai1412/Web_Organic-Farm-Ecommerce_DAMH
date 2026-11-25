<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $newPermissions = [
        'view_revenue' => ['id' => 11, 'description' => 'Xem doanh thu'],
        'view_financial_reports' => ['id' => 12, 'description' => 'Xem báo cáo tài chính'],
        'view_customers' => ['id' => 13, 'description' => 'Xem thông tin khách hàng'],
        'manage_customers' => ['id' => 14, 'description' => 'Quản lý thông tin khách hàng'],
    ];

    public function up(): void
    {
        Schema::table('nguoi_dung', function (Blueprint $table): void {
            $table->text('Ly_do_khoa')->nullable();
        });

        foreach ($this->newPermissions as $name => $permission) {
            DB::table('quyen')->updateOrInsert(
                ['Ten_quyen' => $name],
                [
                    'Ma_quyen' => $permission['id'],
                    'Mo_ta' => $permission['description'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        $farmRoleId = DB::table('vai_tro')->where('Ten_vai_tro', 'Farm_Staff')->value('Ma_vai_tro');
        if ($farmRoleId) {
            $restrictedIds = DB::table('quyen')
                ->whereIn('Ten_quyen', [
                    'view_admin_reports',
                    'view_revenue',
                    'view_financial_reports',
                    'view_customers',
                    'manage_customers',
                ])
                ->pluck('Ma_quyen');

            DB::table('vai_tro_quyen')
                ->where('Ma_vai_tro', $farmRoleId)
                ->whereIn('Ma_quyen', $restrictedIds)
                ->delete();
        }

        $adminRoleId = DB::table('vai_tro')->where('Ten_vai_tro', 'Admin')->value('Ma_vai_tro');
        if ($adminRoleId) {
            $permissionIds = DB::table('quyen')->pluck('Ma_quyen');
            foreach ($permissionIds as $permissionId) {
                DB::table('vai_tro_quyen')->insertOrIgnore([
                    'Ma_vai_tro' => $adminRoleId,
                    'Ma_quyen' => $permissionId,
                ]);
            }
        }

        $salesRoleId = DB::table('vai_tro')->where('Ten_vai_tro', 'Sales')->value('Ma_vai_tro');
        if ($salesRoleId) {
            $salesPermissionIds = DB::table('quyen')
                ->whereIn('Ten_quyen', ['view_customers', 'manage_customers'])
                ->pluck('Ma_quyen');

            foreach ($salesPermissionIds as $permissionId) {
                DB::table('vai_tro_quyen')->insertOrIgnore([
                    'Ma_vai_tro' => $salesRoleId,
                    'Ma_quyen' => $permissionId,
                ]);
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('quyen')
            ->whereIn('Ten_quyen', array_keys($this->newPermissions))
            ->pluck('Ma_quyen');
        DB::table('vai_tro_quyen')->whereIn('Ma_quyen', $permissionIds)->delete();
        DB::table('quyen')->whereIn('Ma_quyen', $permissionIds)->delete();

        Schema::table('nguoi_dung', function (Blueprint $table): void {
            $table->dropColumn('Ly_do_khoa');
        });
    }
};
