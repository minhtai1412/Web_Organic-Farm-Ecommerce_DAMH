<?php

/*
 * Luồng khách hàng: đăng ký gói rau theo tháng và lịch giao hàng.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreSubscriptionRequest;
use App\Models\DangKyGoi;
use App\Models\GoiDinhKy;
use App\Models\LichGiaoDinhKy;
use App\Models\ThanhToan;
use App\Services\ApiPayPaymentService;
use App\Services\SubscriptionAddressGeocodingException;
use App\Services\SubscriptionGeneratorService;
use App\Traits\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SubscriptionController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $registrations = DangKyGoi::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->with([
                'goi.chiTiets.sanPham',
                'diaChi',
                'lichGiao',
                'donHangs.chiTiets.sanPham',
            ])
            ->orderByDesc('Ma_dang_ky')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $registrations,
            'Lấy danh sách gói định kỳ thành công.',
            $registrations->getCollection()
                ->map(fn(DangKyGoi $registration) => $this->formatRegistration($registration))
                ->all()
        );
    }

    public function pause(Request $request, int $subscriptionId): JsonResponse
    {
        return $this->changeStatus($request, $subscriptionId, 'Tam_dung', 'Dang_hoat_dong');
    }

    public function resume(Request $request, int $subscriptionId): JsonResponse
    {
        return $this->changeStatus($request, $subscriptionId, 'Dang_hoat_dong', 'Tam_dung');
    }

    private function changeStatus(
        Request $request,
        int $subscriptionId,
        string $newStatus,
        string $expectedStatus
    ): JsonResponse {
        $registration = DB::transaction(function () use ($request, $subscriptionId, $newStatus, $expectedStatus) {
            $registration = DangKyGoi::query()
                ->where('Ma_dang_ky', $subscriptionId)
                ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $registration->Trang_thai !== $expectedStatus
                || CarbonImmutable::parse($registration->Ngay_ket_thuc)->isBefore(CarbonImmutable::today())
            ) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Gói không ở trạng thái phù hợp để cập nhật.',
                ]);
            }

            $registration->update(['Trang_thai' => $newStatus]);
            LichGiaoDinhKy::query()
                ->where('Ma_dang_ky', $registration->Ma_dang_ky)
                ->update(['Trang_thai' => $newStatus === 'Tam_dung' ? 'Tam_ngung' : 'Hoat_dong']);

            return $registration->refresh();
        });

        return $this->successResponse(
            $newStatus === 'Tam_dung' ? 'Tạm ngưng gói định kỳ thành công.' : 'Tiếp tục gói định kỳ thành công.',
            [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'status' => $registration->Trang_thai,
            ]
        );
    }

    private function formatRegistration(DangKyGoi $registration): array
    {
        $address = $registration->diaChi;
        $package = $registration->goi;
        $notExpired = ! CarbonImmutable::parse($registration->Ngay_ket_thuc)
            ->isBefore(CarbonImmutable::today());

        return [
            'subscription_id' => (int) $registration->Ma_dang_ky,
            'status' => $registration->Trang_thai,
            'start_date' => $registration->Ngay_bat_dau,
            'end_date' => $registration->Ngay_ket_thuc,
            'can_pause' => $registration->Trang_thai === 'Dang_hoat_dong' && $notExpired,
            'can_resume' => $registration->Trang_thai === 'Tam_dung'
                && $notExpired,
            'package' => $package ? [
                'id' => (int) $package->Ma_goi,
                'name' => $package->Ten_goi,
                'price' => (float) $package->Gia_goi,
                'duration_months' => (int) $package->Ky_han_thang,
                'weight_per_delivery' => (float) $package->Khoi_luong_moi_lan,
                'items' => $package->chiTiets->map(fn($item) => [
                    'name' => $item->sanPham?->Ten_san_pham,
                    'quantity' => (float) $item->So_luong,
                ])->all(),
            ] : null,
            'address' => $address ? implode(', ', array_filter([
                $address->Dia_chi_chi_tiet,
                $address->Phuong_xa,
                $address->Tinh_thanh,
            ])) : null,
            'delivery_days' => $registration->lichGiao
                ->map(fn(LichGiaoDinhKy $day) => [
                    'weekday' => (int) $day->Thu_trong_tuan,
                    'delivery_window' => $day->Khung_gio_giao,
                    'status' => $day->Trang_thai,
                ])
                ->all(),
            'deliveries' => $registration->donHangs
                ->sortByDesc('Ngay_dat')
                ->map(fn($order) => [
                    'order_id' => (int) $order->Ma_don_hang,
                    'status' => $order->Trang_thai,
                    'ordered_at' => $order->Ngay_dat,
                    'total' => (float) $order->Tong_tien,
                    'items' => $order->chiTiets->map(fn($item) => [
                        'name' => $item->sanPham?->Ten_san_pham,
                        'quantity' => (float) $item->So_luong,
                    ])->all(),
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Lưu gói và toàn bộ lịch trong một transaction; đăng ký chỉ hoạt động sau ApiPay webhook.
     */
    public function store(
        StoreSubscriptionRequest $request,
        SubscriptionGeneratorService $subscriptions
    ): JsonResponse {
        $userId = (int) $request->user()->getAuthIdentifier();
        try {
            $registration = $subscriptions->registerSubscription($userId, $request->validated());
        } catch (SubscriptionAddressGeocodingException) {
            return $this->errorResponse(
                message: 'Không thể xác định tọa độ địa chỉ. Vui lòng kiểm tra địa chỉ hoặc liên hệ quản trị viên.',
                status: 422,
                errorCode: self::ERR_BAD_REQUEST
            );
        }

        return $this->successResponse(
            message: 'Tạo đăng ký gói thành công. Vui lòng thanh toán để kích hoạt gói.',
            data: [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'package_id' => (int) $registration->Ma_goi,
                'start_date' => $registration->Ngay_bat_dau,
                'end_date' => $registration->Ngay_ket_thuc,
                'status' => $registration->Trang_thai,
            ],
            status: 201
        );
    }

    /**
     * Tạo hoặc khôi phục yêu cầu ApiPay cho đăng ký đang chờ thanh toán.
     */
    public function checkout(
        Request $request,
        int $subscriptionId,
        ApiPayPaymentService $apiPay
    ): JsonResponse {
        $bankPublicId = config('services.apipay.bank_public_id');

        if (
            ! is_string($bankPublicId)
            || $bankPublicId === ''
            || ! $apiPay->configurationStatus()['ready']
        ) {
            throw ValidationException::withMessages([
                'subscription_id' => 'ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook.',
            ]);
        }

        $userId = (int) $request->user()->getAuthIdentifier();
        $registration = DangKyGoi::query()
            ->where('Ma_dang_ky', $subscriptionId)
            ->where('Ma_nguoi_dung', $userId)
            ->firstOrFail();

        if ($registration->Trang_thai !== 'Cho_thanh_toan') {
            throw ValidationException::withMessages([
                'subscription_id' => 'Đăng ký không ở trạng thái chờ thanh toán.',
            ]);
        }

        $existingPayment = ThanhToan::query()
            ->where('Ma_dang_ky_goi', $registration->Ma_dang_ky)
            ->where('Phuong_thuc', 'ApiPay')
            ->where('Trang_thai', 'Khoi_tao')
            ->latest('Ma_thanh_toan')
            ->first();

        if ($existingPayment) {
            if (! $existingPayment->Ma_yeu_cau_apipay) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Yêu cầu thanh toán trước có thể đã được ApiPay tiếp nhận; hãy kiểm tra trạng thái trước khi thử lại.',
                ]);
            }

            $remotePayment = $apiPay->getPaymentRequest($existingPayment->Ma_yeu_cau_apipay);
            if (($remotePayment['status'] ?? null) === 'ACTIVE' && ! empty($remotePayment['payUrl'])) {
                return $this->paymentResponse($existingPayment, $remotePayment, 200);
            }

            if (in_array($remotePayment['status'] ?? null, ['EXPIRED', 'CANCELLED'], true)) {
                $existingPayment->update(['Trang_thai' => 'That_bai']);
            } else {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Yêu cầu thanh toán hiện tại cần được đối soát trước khi thử lại.',
                ]);
            }
        }

        $payment = DB::transaction(function () use ($registration, $userId): ThanhToan {
            $lockedRegistration = DangKyGoi::query()
                ->whereKey($registration->Ma_dang_ky)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRegistration->Trang_thai !== 'Cho_thanh_toan') {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Đăng ký đã thay đổi trạng thái.',
                ]);
            }

            $pendingPaymentExists = ThanhToan::query()
                ->where('Ma_dang_ky_goi', $lockedRegistration->Ma_dang_ky)
                ->where('Phuong_thuc', 'ApiPay')
                ->where('Trang_thai', 'Khoi_tao')
                ->exists();

            if ($pendingPaymentExists) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Đăng ký đã có yêu cầu thanh toán đang được khởi tạo.',
                ]);
            }

            $package = GoiDinhKy::query()
                ->whereKey($lockedRegistration->Ma_goi)
                ->where('Trang_thai', 'Dang_mo')
                ->lockForUpdate()
                ->firstOrFail();
            $amount = (float) $package->Gia_goi;

            if ($amount < 1 || $amount > 300_000_000 || $amount !== (float) (int) $amount) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Giá gói không hợp lệ để thanh toán qua ApiPay.',
                ]);
            }

            return ThanhToan::query()->create([
                'Ma_dang_ky_goi' => $lockedRegistration->Ma_dang_ky,
                'Phuong_thuc' => 'ApiPay',
                'Noi_dung_thanh_toan' => 'DK' . $lockedRegistration->Ma_dang_ky . 'X' . Str::upper(Str::random(8)),
                'So_tien' => (int) $amount,
                'Trang_thai' => 'Khoi_tao',
            ]);
        });

        try {
            $remotePayment = $apiPay->createPaymentRequest(
                $bankPublicId,
                (int) $payment->So_tien,
                $payment->Noi_dung_thanh_toan
            );
        } catch (ConnectionException | RuntimeException $exception) {
            Log::warning('ApiPay subscription payment request could not be confirmed; keeping it pending for reconciliation.', [
                'payment_id' => $payment->Ma_thanh_toan,
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        $payment->update([
            'Ma_yeu_cau_apipay' => $remotePayment['public_id'],
            'Duong_dan_thanh_toan' => $remotePayment['pay_url'],
        ]);

        return $this->paymentResponse($payment, $remotePayment, 201);
    }

    /**
     * Chỉ trả trạng thái đăng ký cho đúng chủ sở hữu; tự động đối soát với ApiPay nếu vẫn đang chờ.
     */
    public function show(
        Request $request,
        int $subscriptionId,
        ApiPayPaymentService $apiPay
    ): JsonResponse {
        $userId = (int) $request->user()->getAuthIdentifier();
        $registration = DangKyGoi::query()
            ->where('Ma_dang_ky', $subscriptionId)
            ->where('Ma_nguoi_dung', $userId)
            ->firstOrFail();

        $payment = ThanhToan::query()
            ->where('Ma_dang_ky_goi', $registration->Ma_dang_ky)
            ->where('Phuong_thuc', 'ApiPay')
            ->latest('Ma_thanh_toan')
            ->first();

        if (
            $registration->Trang_thai === 'Cho_thanh_toan'
            && $payment
            && $payment->Trang_thai === 'Khoi_tao'
            && ! empty($payment->Ma_yeu_cau_apipay)
        ) {
            try {
                $remote = $apiPay->getPaymentRequest($payment->Ma_yeu_cau_apipay);
                $remoteStatus = strtoupper((string) ($remote['status'] ?? ''));

                if (in_array($remoteStatus, ['PAID', 'COMPLETED', 'SUCCESS'], true)) {
                    DB::transaction(function () use ($registration, $payment, $remote): void {
                        $lockedReg = DangKyGoi::query()
                            ->whereKey($registration->Ma_dang_ky)
                            ->lockForUpdate()
                            ->first();
                        $lockedPay = ThanhToan::query()
                            ->whereKey($payment->Ma_thanh_toan)
                            ->lockForUpdate()
                            ->first();

                        if ($lockedPay && $lockedPay->Trang_thai === 'Khoi_tao') {
                            $txId = $remote['transactionId'] ?? $remote['transaction_id'] ?? null;
                            $lockedPay->update([
                                'Ma_giao_dich_apipay' => is_string($txId) && $txId !== '' ? $txId : $lockedPay->Ma_giao_dich_apipay,
                                'Trang_thai' => 'Thanh_cong',
                                'Thoi_gian_thanh_toan' => now(),
                            ]);
                        }

                        if ($lockedReg && $lockedReg->Trang_thai === 'Cho_thanh_toan') {
                            $lockedReg->update(['Trang_thai' => 'Dang_hoat_dong']);
                        }
                    });

                    $registration->refresh();
                    $payment->refresh();
                } elseif (in_array($remoteStatus, ['EXPIRED', 'CANCELLED'], true)) {
                    $payment->update(['Trang_thai' => 'That_bai']);
                    $payment->refresh();
                }
            } catch (\Throwable $e) {
                Log::warning('ApiPay subscription status reconciliation skipped.', [
                    'subscription_id' => $registration->Ma_dang_ky,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->successResponse(
            message: 'Lấy trạng thái đăng ký gói thành công.',
            data: [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'status' => $registration->Trang_thai,
                'start_date' => $registration->Ngay_bat_dau,
                'end_date' => $registration->Ngay_ket_thuc,
                'payment_status' => $payment?->Trang_thai,
            ]
        );
    }

    private function paymentResponse(ThanhToan $payment, array $remote, int $status): JsonResponse
    {
        return $this->successResponse(
            message: $status === 201
                ? 'Khởi tạo thanh toán ApiPay cho gói thành công.'
                : 'Lấy liên kết thanh toán ApiPay hiện có thành công.',
            data: [
                'payment_request_id' => $payment->Ma_yeu_cau_apipay ?? $remote['public_id'] ?? null,
                'amount' => (int) $payment->So_tien,
                'pay_url' => $remote['pay_url'] ?? $remote['payUrl'] ?? null,
                'qr_url' => $remote['qr_url'] ?? $remote['qrUrl'] ?? null,
                'status' => $remote['status'] ?? null,
                'expires_at' => $remote['expires_at'] ?? $remote['expiresAt'] ?? null,
            ],
            status: $status
        );
    }



    /**
     * Hủy đăng ký gói định kỳ đang ở trạng thái chờ thanh toán.
     */
    public function cancel(Request $request, int $subscriptionId): JsonResponse
    {
        $registration = DB::transaction(function () use ($request, $subscriptionId): DangKyGoi {
            $registration = DangKyGoi::query()
                ->where('Ma_dang_ky', $subscriptionId)
                ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
                ->lockForUpdate()
                ->firstOrFail();

            if ($registration->Trang_thai !== 'Cho_thanh_toan') {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Chỉ có thể hủy đăng ký gói đang ở trạng thái chờ thanh toán.',
                ]);
            }

            $registration->update(['Trang_thai' => 'Da_huy']);

            LichGiaoDinhKy::query()
                ->where('Ma_dang_ky', $registration->Ma_dang_ky)
                ->update(['Trang_thai' => 'Tam_ngung']);

            ThanhToan::query()
                ->where('Ma_dang_ky_goi', $registration->Ma_dang_ky)
                ->where('Trang_thai', 'Khoi_tao')
                ->update(['Trang_thai' => 'That_bai']);

            return $registration->refresh();
        });

        return $this->successResponse(
            message: 'Đã hủy đăng ký gói định kỳ thành công.',
            data: [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'status' => $registration->Trang_thai,
            ]
        );
    }
}
