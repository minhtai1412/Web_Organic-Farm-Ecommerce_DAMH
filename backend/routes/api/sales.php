<?php

use App\Http\Controllers\Api\Sales\OrderProcessController;
use App\Http\Controllers\Api\Sales\FlashSaleController;
use App\Http\Controllers\Api\Sales\DeliveryController;
use App\Http\Controllers\Api\Sales\InventoryFefoController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:sales'])->prefix('sales')->group(function () {
    Route::get('/orders', [OrderProcessController::class, 'index']);
    Route::post('/orders/{orderId}/confirm', [OrderProcessController::class, 'confirm'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/confirm-cod-payment', [OrderProcessController::class, 'confirmCodPayment'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/dispatch', [DeliveryController::class, 'dispatch'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/delivery-success', [DeliveryController::class, 'markDelivered'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/delivery-failure', [DeliveryController::class, 'markFailed'])->whereNumber('orderId');
    Route::get('/inventory', [InventoryFefoController::class, 'index']);
    Route::get('/expiring-batches', [InventoryFefoController::class, 'expiringBatches']);
    Route::get('/flash-sales', [FlashSaleController::class, 'index']);
    Route::post('/flash-sales', [FlashSaleController::class, 'store']);
    Route::patch('/flash-sales/{campaignId}/status', [FlashSaleController::class, 'updateStatus'])
        ->whereNumber('campaignId');
});