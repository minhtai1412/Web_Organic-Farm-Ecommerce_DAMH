<?php

/*
 * Lập lịch cronjob tự động sinh đơn định kỳ, hủy đơn quá hạn thanh toán và quét hạn sử dụng lô hàng FEFO.
 */

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('orders:expire-pending-payments')
    ->everyMinute()
    ->withoutOverlapping();

Schedule::command('inventory:sync-batch-expiry')
    ->hourly()
    ->withoutOverlapping();

// Schedule::command('subscriptions:generate-orders')
//     ->hourlyAt(0)
//     ->between('06:00', '10:00')
//     ->withoutOverlapping();

Schedule::command('subscriptions:generate-orders')
    ->everyMinute()
    ->withoutOverlapping();