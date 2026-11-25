<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('giao_hang', function (Blueprint $table): void {
            $table->string('Ghi_chu_dieu_phoi', 500)->nullable();
            $table->string('Ly_do_that_bai', 500)->nullable();
            $table->unique('Ma_van_don', 'uq_giao_hang_ma_van_don');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE bien_dong_kho MODIFY Loai_bien_dong ENUM('Hao_hut', 'Xuat_huy', 'Dieu_chinh', 'Nhap_hoan') NOT NULL"
            );
        } else {
            Schema::table('bien_dong_kho', function (Blueprint $table): void {
                $table->enum('Loai_bien_dong', ['Hao_hut', 'Xuat_huy', 'Dieu_chinh', 'Nhap_hoan'])->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('bien_dong_kho')
            ->where('Loai_bien_dong', 'Nhap_hoan')
            ->update(['Loai_bien_dong' => 'Dieu_chinh']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE bien_dong_kho MODIFY Loai_bien_dong ENUM('Hao_hut', 'Xuat_huy', 'Dieu_chinh') NOT NULL"
            );
        } else {
            Schema::table('bien_dong_kho', function (Blueprint $table): void {
                $table->enum('Loai_bien_dong', ['Hao_hut', 'Xuat_huy', 'Dieu_chinh'])->change();
            });
        }

        Schema::table('giao_hang', function (Blueprint $table): void {
            $table->dropUnique('uq_giao_hang_ma_van_don');
            $table->dropColumn(['Ghi_chu_dieu_phoi', 'Ly_do_that_bai']);
        });
    }
};
