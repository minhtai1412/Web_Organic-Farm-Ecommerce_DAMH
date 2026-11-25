<?php

/*
 * Luồng khách hàng: tính phí giao hàng và khởi tạo thanh toán ApiPay cho đơn lẻ.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\ThanhToan;
use App\Services\ApiPayPaymentService;
use App\Traits\ApiResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CheckoutController extends Controller
{
    use ApiResponse;

    public function options(ApiPayPaymentService $apiPay): JsonResponse
    {
        return $this->successResponse(
            message: 'Lấy cấu hình thanh toán thành công.',
            data: [
                'bank_name' => config('services.apipay.bank_name', 'ApiPay'),
                ...$apiPay->configurationStatus(),
            ]
        );
    }

    public function store(Request $request, ApiPayPaymentService $apiPay): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'min:1'],
        ]);
        $bankPublicId = config('services.apipay.bank_public_id');

        if (
            ! is_string($bankPublicId)
            || $bankPublicId === ''
            || ! $apiPay->configurationStatus()['ready']
        ) {
            throw ValidationException::withMessages([
                'order_id' => 'ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook.',
            ]);
        }

        $order = DonHang::query()
            ->where('Ma_don_hang', $validated['order_id'])
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->firstOrFail();

        if ($order->Trang_thai !== 'Cho_thanh_toan') {
            throw ValidationException::withMessages([
                'order_id' => 'Đơn hàng không ở trạng thái chờ thanh toán.',
            ]);
        }

        $amount = (int) $order->Tong_tien;
        if (
            $amount < 1
            || $amount > 300_000_000
            || (float) $order->Tong_tien !== (float) $amount
        ) {
            throw ValidationException::withMessages([
                'order_id' => 'Tổng tiền đơn hàng không hợp lệ để thanh toán qua ApiPay.',
            ]);
        }

        $existingPayment = ThanhToan::query()
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Phuong_thuc', 'ApiPay')
            ->where('Trang_thai', 'Khoi_tao')
            ->latest('Ma_thanh_toan')
            ->first();

        if ($existingPayment) {
            if (! $existingPayment->Ma_yeu_cau_apipay) {
                throw ValidationException::withMessages([
                    'order_id' => 'Yêu cầu thanh toán trước có thể đã được ApiPay tiếp nhận; hãy chờ webhook hoặc đối soát trước khi thử lại.',
                ]);
            }

            $remotePayment = $apiPay->getPaymentRequest($existingPayment->Ma_yeu_cau_apipay);
            $remoteStatus = strtoupper((string) ($remotePayment['status'] ?? ''));

            if ($remoteStatus === 'ACTIVE' && ! empty($remotePayment['payUrl'])) {
                return $this->successResponse(
                    message: 'Lấy liên kết thanh toán ApiPay hiện có thành công.',
                    data: [
                        'payment_request_id' => $existingPayment->Ma_yeu_cau_apipay,
                        'pay_url' => $remotePayment['payUrl'],
                        'qr_url' => $remotePayment['qrUrl'] ?? null,
                        'status' => $remotePayment['status'],
                        'expires_at' => $remotePayment['expiresAt'] ?? null,
                    ],
                    status: 200
                );
            }

            if (in_array($remoteStatus, ['PAID', 'COMPLETED', 'SUCCESS'], true)) {
                DB::transaction(function () use ($order, $existingPayment, $remotePayment): void {
                    $existingPayment->update([
                        'Ma_giao_dich_apipay' => $remotePayment['transactionId'] ?? $existingPayment->Ma_giao_dich_apipay,
                        'Trang_thai' => 'Thanh_cong',
                        'Thoi_gian_thanh_toan' => now(),
                    ]);

                    DonHang::query()
                        ->where('Ma_don_hang', $order->Ma_don_hang)
                        ->where('Trang_thai', 'Cho_thanh_toan')
                        ->update(['Trang_thai' => 'Cho_xac_nhan']);
                });

                return $this->successResponse(
                    message: 'Đơn hàng đã được thanh toán thành công trước đó.',
                    data: [
                        'payment_request_id' => $existingPayment->Ma_yeu_cau_apipay,
                        'already_paid' => true,
                        'status' => $remoteStatus,
                    ],
                    status: 200
                );
            }

            if (in_array($remoteStatus, ['EXPIRED', 'CANCELLED'], true)) {
                $existingPayment->update(['Trang_thai' => 'That_bai']);
            } else {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng đang có yêu cầu thanh toán cần được đối soát trước khi thử lại.',
                ]);
            }
        }

        $payment = DB::transaction(function () use ($order, $amount): ThanhToan {
            $lockedOrder = DonHang::query()
                ->whereKey($order->Ma_don_hang)
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $lockedOrder->Trang_thai !== 'Cho_thanh_toan'
                || (int) $lockedOrder->Tong_tien !== $amount
                || (float) $lockedOrder->Tong_tien !== (float) $amount
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng đã thay đổi; hãy tải lại trước khi thanh toán.',
                ]);
            }

            $pendingPaymentExists = ThanhToan::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->where('Phuong_thuc', 'ApiPay')
                ->where('Trang_thai', 'Khoi_tao')
                ->exists();

            if ($pendingPaymentExists) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng đã có yêu cầu thanh toán đang được khởi tạo.',
                ]);
            }

            $content = 'DH'.$order->Ma_don_hang.'X'.Str::upper(Str::random(8));

            return ThanhToan::query()->create([
                'Ma_don_hang' => $order->Ma_don_hang,
                'Phuong_thuc' => 'ApiPay',
                'Noi_dung_thanh_toan' => $content,
                'So_tien' => $amount,
                'Trang_thai' => 'Khoi_tao',
            ]);
        });

        try {
            $paymentRequest = $apiPay->createPaymentRequest(
                $bankPublicId,
                $amount,
                $payment->Noi_dung_thanh_toan
            );
        } catch (ConnectionException|RuntimeException $exception) {
            Log::warning('ApiPay payment request could not be confirmed; keeping it pending for reconciliation.', [
                'payment_id' => $payment->Ma_thanh_toan,
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        $payment->update([
            'Ma_yeu_cau_apipay' => $paymentRequest['public_id'],
            'Duong_dan_thanh_toan' => $paymentRequest['pay_url'],
        ]);

        return $this->successResponse(
            message: 'Khởi tạo yêu cầu thanh toán ApiPay thành công.',
            data: [
                'payment_request_id' => $paymentRequest['public_id'],
                'pay_url' => $paymentRequest['pay_url'],
                'qr_url' => $paymentRequest['qr_url'],
                'status' => $paymentRequest['status'],
                'expires_at' => $paymentRequest['expires_at'],
            ],
            status: 201
        );
    }
}