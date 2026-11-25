/* Màn hình chờ quét mã QR ApiPay 2 cột: bên trái là mã QR & thao tác thanh toán, bên phải là thông tin giao hàng & chi tiết đơn. */
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { showGlobalToast } from "../../GlobalToast";
import { formatCurrencyVnd } from "../../../services/publicApi";

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Math.floor(secondsLeft));
  const mins = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function CheckoutPendingPayment({
  order,
  checkingPayment,
  onCheckStatus,
}) {
  const orderId = order.order_id ?? order.id;
  const paymentUrl = order.pay_url || order.payment_url || "";
  const qrUrl = order.qr_url || "";

  const totalAmount = Number(order.total ?? 0);
  const subtotalAmount = Number(order.subtotal ?? 0);
  const shippingFee = Number(order.shipping_fee ?? 0);
  const pointsDiscount = Number(order.points_discount ?? 0);
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.address || null;

  const targetExpiryMs = useMemo(() => {
    if (order.expires_at) {
      const parsed = Date.parse(order.expires_at);
      if (Number.isFinite(parsed)) return parsed;
    }
    const createdMs = Number(order._created_at_ms) || Date.now();
    return createdMs + 15 * 60 * 1000;
  }, [order.expires_at, order._created_at_ms]);

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((targetExpiryMs - Date.now()) / 1000))
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      setSecondsLeft(Math.max(0, Math.floor((targetExpiryMs - Date.now()) / 1000)));
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [targetExpiryMs]);

  const handleCopyLink = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      showGlobalToast("Đã sao chép liên kết thanh toán ApiPay.", "success");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showGlobalToast("Không thể sao chép liên kết. Vui lòng thử lại.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
      {/* CỘT TRÁI: MÃ QR THANH TOÁN & THAO TÁC (7 CỘT) */}
      <section className="lg:col-span-7 rounded-3xl bg-white border border-[#c0c9bb]/50 p-6 sm:p-8 shadow-2xs text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-bold">
          Chờ xác nhận thanh toán ApiPay
        </span>

        <div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#191c1b] tracking-tight">
            Đơn hàng #{orderId}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5a6357]">
            Quét mã QR hoặc mở trang thanh toán ApiPay để hoàn tất đơn hàng.
          </p>
        </div>

        {/* Khung tổng tiền cần thanh toán & đếm ngược */}
        <div className="mx-auto max-w-md rounded-2xl bg-[#f1f8f2] border border-[#cce4cf] px-5 py-3.5 space-y-1">
          <p className="text-xs font-semibold text-[#41493e]">
            Tổng tiền cần thanh toán
          </p>
          <p className="text-2xl sm:text-3xl font-black text-[#006e1c] tabular-nums">
            {formatCurrencyVnd(totalAmount)}
          </p>
          <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#7a5a18] pt-0.5 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {secondsLeft > 0
                ? `Mã QR có hiệu lực trong ${formatCountdown(secondsLeft)}`
                : "Mã QR đã hết hạn. Vui lòng kiểm tra trạng thái hoặc tạo lại giao dịch."}
            </span>
          </p>
        </div>

        {/* Ảnh mã QR ApiPay */}
        {qrUrl && (
          <div className="mx-auto w-56 h-56 sm:w-60 sm:h-60 rounded-2xl bg-white p-3 border border-[#c0c9bb]/60 shadow-2xs flex items-center justify-center">
            <img
              src={qrUrl}
              alt={`Mã QR thanh toán ApiPay cho đơn hàng #${orderId}`}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Hàng 3 nút thao tác */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 sm:px-5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-2xs transition-colors"
            >
              <span>Mở trang thanh toán ApiPay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {paymentUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-10 px-4 rounded-xl border border-[#c0c9bb]/80 bg-white hover:bg-[#f6f8f6] text-xs sm:text-sm font-bold text-[#191c1b] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#006e1c]" />
                  <span className="text-[#006e1c]">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#5a6357]" />
                  <span>Sao chép liên kết</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onCheckStatus}
            disabled={checkingPayment}
            className="h-10 px-4 rounded-xl border border-[#c0c9bb]/80 bg-white hover:bg-[#f6f8f6] text-xs sm:text-sm font-bold text-[#191c1b] inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#006e1c] ${checkingPayment ? "animate-spin" : ""}`} />
            <span>Kiểm tra trạng thái</span>
          </button>
        </div>

        {/* Ghi chú tự động kiểm tra */}
        <div className="pt-2 border-t border-[#c0c9bb]/35 flex items-center justify-center gap-2 text-[11.5px] text-[#5a6357]">
          <ShieldCheck className="w-4 h-4 text-[#006e1c] shrink-0" />
          <p>
            <strong className="font-bold text-[#006e1c]">
              Hệ thống tự động kiểm tra trạng thái thanh toán.
            </strong>{" "}
            Thông tin được cập nhật sau khi ApiPay xác nhận giao dịch.
          </p>
        </div>
      </section>

      {/* CỘT PHẢI: THÔNG TIN GIAO HÀNG & SẢN PHẨM TRONG ĐƠN (5 CỘT) */}
      <aside className="lg:col-span-5 space-y-4">
        {/* Thẻ 1: Thông tin giao hàng */}
        <div className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[#00450d]">
            <Truck className="w-4 h-4 text-[#006e1c] shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#191c1b]">
              Thông tin giao hàng
            </h3>
          </div>

          {address ? (
            <div className="space-y-1.5 text-xs sm:text-sm text-[#41493e]">
              <p className="font-extrabold text-[#191c1b] text-sm sm:text-[15px]">
                {address.recipient_name}
              </p>
              {address.phone && (
                <p className="flex items-center gap-2 text-[#5a6357] tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
                  <span>{address.phone}</span>
                </p>
              )}
              {address.address && (
                <p className="flex items-start gap-2 text-[#5a6357] leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-[#006e1c] shrink-0 mt-0.5" />
                  <span>{address.address}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#5a6357]">
              Đơn hàng sẽ được giao tới địa chỉ nhận hàng đã chọn.
            </p>
          )}

          <div className="rounded-xl bg-[#f6f8f6] border border-[#c0c9bb]/40 px-3.5 py-2.5 text-xs text-[#5a6357] leading-relaxed">
            Thời gian giao dự kiến sẽ được cập nhật sau khi đơn hàng được xác nhận.
          </div>
        </div>

        {/* Thẻ 2: Sản phẩm trong đơn */}
        <div className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 sm:p-6 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-[#00450d]">
            <Package className="w-4 h-4 text-[#006e1c] shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#191c1b]">
              Sản phẩm trong đơn
            </h3>
          </div>

          {items.length > 0 && (
            <div className="divide-y divide-[#c0c9bb]/30">
              {items.map((item, idx) => (
                <div
                  key={`${item.productId ?? item.id ?? idx}-${idx}`}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#191c1b] leading-snug">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#5a6357] mt-0.5 tabular-nums">
                      {item.quantity} {item.unit || "kg"} ×{" "}
                      {formatCurrencyVnd(item.unitPrice ?? item.unit_price ?? 0)}
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#191c1b] tabular-nums shrink-0">
                    {formatCurrencyVnd(item.subtotal ?? item.line_total ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#c0c9bb]/45 pt-3 space-y-2 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[#5a6357]">
              <span>Tạm tính</span>
              <span className="font-semibold text-[#191c1b] tabular-nums">
                {formatCurrencyVnd(subtotalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#5a6357]">
              <span>Phí giao hàng</span>
              <span className="font-semibold text-[#191c1b] tabular-nums">
                {formatCurrencyVnd(shippingFee)}
              </span>
            </div>

            {pointsDiscount > 0 && (
              <div className="flex items-center justify-between text-[#006e1c]">
                <span>Giảm từ điểm thưởng</span>
                <span className="font-semibold tabular-nums">
                  - {formatCurrencyVnd(pointsDiscount)}
                </span>
              </div>
            )}

            <div className="border-t border-[#c0c9bb]/45 pt-2.5 flex items-center justify-between text-sm sm:text-base font-extrabold text-[#191c1b]">
              <span>Tổng thanh toán</span>
              <span className="text-[#00450d] tabular-nums">
                {formatCurrencyVnd(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}