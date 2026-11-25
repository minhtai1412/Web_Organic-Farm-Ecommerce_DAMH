<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SystemSettingController;
use App\Http\Controllers\Api\Admin\UserRoleController;
use App\Http\Controllers\Api\Admin\AdminRbacController;
use App\Http\Controllers\Api\Admin\SubscriptionPackageController;
use App\Http\Controllers\Api\Admin\FarmProfileController;
use Illuminate\Support\Facades\Route;

// Nhóm API Quản trị viên (bảo vệ bằng auth:sanctum + role:admin)
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('/users', [UserRoleController::class, 'index']);
    Route::post('/users/staff', [UserRoleController::class, 'storeStaff']);
    Route::put('/users/{id}', [UserRoleController::class, 'update'])->whereNumber('id');
    Route::patch('/users/{id}/toggle-status', [UserRoleController::class, 'toggleStatus'])->whereNumber('id');
    Route::put('/users/{id}/status', [UserRoleController::class, 'updateStatus']);
    Route::get('/roles', [AdminRbacController::class, 'index']);
    Route::put('/roles/{role}/permissions', [AdminRbacController::class, 'update']);
    Route::get('/settings', [SystemSettingController::class, 'index']);
    Route::put('/settings', [SystemSettingController::class, 'update']);

    // Quản lý danh mục nông sản (Admin)
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::patch('/categories/{id}/status', [CategoryController::class, 'updateStatus']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // Quản lý danh sách sản phẩm nông sản (Admin)
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::patch('/products/{id}/status', [ProductController::class, 'updateStatus']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // cấu hình
    Route::get('/settings', [\App\Http\Controllers\Api\Admin\SystemSettingController::class, 'index']);
    Route::put('/settings', [\App\Http\Controllers\Api\Admin\SystemSettingController::class, 'update']);

    //Gói rau định kỳ
    Route::get('/subscriptions', [SubscriptionPackageController::class, 'index']);
    Route::post('/subscriptions', [SubscriptionPackageController::class, 'store']);
    Route::put('/subscriptions/{id}', [SubscriptionPackageController::class, 'update']);
    Route::patch('/subscriptions/{id}/status', [SubscriptionPackageController::class, 'updateStatus']);
    Route::delete('/subscriptions/{id}', [SubscriptionPackageController::class, 'destroy']);

    // Cấu hình thông tin & hình ảnh nông trại (Admin)
    Route::get('/settings/farm', [FarmProfileController::class, 'show']);
    Route::put('/settings/farm', [FarmProfileController::class, 'update']);
    Route::delete('/settings/farm/images/{imageId}', [FarmProfileController::class, 'destroyImage']);
    Route::post('/settings/farm/geocode', [FarmProfileController::class, 'geocodeAddress']);
});