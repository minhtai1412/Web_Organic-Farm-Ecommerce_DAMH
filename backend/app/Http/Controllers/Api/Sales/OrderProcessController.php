<?php

/*
 * Luồng bán hàng: lọc, phê duyệt và thu tiền COD cho đơn hàng.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use App\Models\ThanhToan;
use App\Services\Order\SalesOrderProcessingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderProcessController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:Cho_thanh_toan,Cho_xac_nhan,Da_xac_nhan,Dang_giao,Hoan_thanh,Da_huy'],
            'payment_method' => ['nullable', 'in:ApiPay,COD,Mien_phi_goi,Giao_bu'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $orders = DonHang::query()
            ->when(
                $validated['status'] ?? null,
                fn ($query, string $status) => $query->where('Trang_thai', $status)
            )
            ->when(
                $validated['payment_method'] ?? null,
                fn ($query, string $method) => $query->whereHas(
                    'thanhToans',
                    fn ($paymentQuery) => $paymentQuery->where('Phuong_thuc', $method)
                )
            )
            ->with([
                'khachHang:Ma_nguoi_dung,Ho_ten,Email,So_dien_thoai',
                'diaChi',
                'chiTiets.sanPham:Ma_san_pham,Ten_san_pham,Hinh_anh_dai_dien,Don_vi_tinh',
                'chiTiets.phanBoLoHangs.loHang:Ma_lo_hang,Han_su_dung',
                'thanhToans',
                'giaoHang',
            ])
            ->orderByDesc('Ngay_dat')
            ->orderByDesc('Ma_don_hang')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $orders,
            'Lấy danh sách đơn hàng thành công.',
            $orders->getCollection()->map(fn (DonHang $order) => $this->formatOrder($order))->all()
        );
    }

    public function confirm(int $orderId, Request $request, SalesOrderProcessingService $orders): JsonResponse
    {
        $order = $orders->confirmOrder($orderId, (int) $request->user()->getAuthIdentifier());

        return $this->successResponse(
            'Phê duyệt đơn hàng thành công.',
            ['order_id' => (int) $order->Ma_don_hang, 'status' => $order->Trang_thai]
        );
    }

    public function confirmCodPayment(
        int $orderId,
        SalesOrderProcessingService $orders
    ): JsonResponse {
        $order = $orders->confirmCodCollection($orderId);

        return $this->successResponse(
            'Xác nhận đã thu tiền COD thành công.',
            ['order_id' => (int) $order->Ma_don_hang, 'payment_status' => 'Thanh_cong']
        );
    }

    private function formatOrder(DonHang $order): array
    {
        $address = $order->diaChi;
        $payments = $order->thanhToans;

        return [
            'order_id' => (int) $order->Ma_don_hang,
            'order_type' => $order->Loai_don,
            'status' => $order->Trang_thai,
            'ordered_at' => $order->Ngay_dat,
            'customer' => [
                'name' => $order->khachHang?->Ho_ten,
                'email' => $order->khachHang?->Email,
                'phone' => $order->khachHang?->So_dien_thoai,
            ],
            'address' => $address ? [
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone' => $address->So_dien_thoai_nguoi_nhan,
                'detail' => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Tinh_thanh,
                ])),
            ] : null,
            'subtotal' => (float) $order->Tien_hang,
            'shipping_fee' => (float) $order->Phi_giao_hang,
            'total' => (float) $order->Tong_tien,
            'note' => $order->Ghi_chu,
            'items' => $order->chiTiets->map(fn ($item) => [
                'product_id' => (int) $item->Ma_san_pham,
                'name' => $item->sanPham?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
                'image' => $item->sanPham?->Hinh_anh_dai_dien,
                'unit' => $item->sanPham?->Don_vi_tinh,
                'quantity' => (float) $item->So_luong,
                'unit_price' => (float) $item->Don_gia,
                'line_total' => (float) $item->Thanh_tien,
                'allocations' => $item->phanBoLoHangs->map(fn (PhanBoLoHang $allocation) => [
                    'batch_id' => (int) $allocation->Ma_lo_hang,
                    'expiry_date' => $allocation->loHang?->Han_su_dung,
                    'quantity' => (float) $allocation->So_luong_xuat,
                ])->all(),
            ])->all(),
            'payments' => $payments->map(fn (ThanhToan $payment) => [
                'method' => $payment->Phuong_thuc,
                'status' => $payment->Trang_thai,
                'amount' => (float) $payment->So_tien,
                'paid_at' => $payment->Thoi_gian_thanh_toan,
            ])->all(),
            'delivery' => $order->giaoHang ? [
                'carrier' => $order->giaoHang->Don_vi_van_chuyen,
                'status' => $order->giaoHang->Trang_thai,
                'tracking_number' => $order->giaoHang->Ma_van_don,
                'shipped_at' => $order->giaoHang->Ngay_xuat_giao,
                'delivered_at' => $order->giaoHang->Ngay_giao_thanh_cong,
                'failure_reason' => $order->giaoHang->Ly_do_that_bai,
                'dispatch_note' => $order->giaoHang->Ghi_chu_dieu_phoi,
            ] : null,
            'can_confirm' => $order->Trang_thai === 'Cho_xac_nhan',
            'can_confirm_cod_collection' => in_array(
                $order->Trang_thai,
                ['Da_xac_nhan', 'Dang_giao', 'Hoan_thanh'],
                true
            ) && $payments->contains(
                fn (ThanhToan $payment) => $payment->Phuong_thuc === 'COD'
                    && $payment->Trang_thai === 'Khoi_tao'
            ),
        ];
    }
}
