/* Màn hình chờ quét mã QR ApiPay 2 cột cho gói rau định kỳ. */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { showGlobalToast } from "../GlobalToast";
import { formatCurrencyVnd } from "../../services/publicApi";

const WEEKDAY_LABELS = {
  1: "Chủ Nhật",
  2: "Thứ Hai",
  3: "Thứ Ba",
  4: "Thứ Tư",
  5: "Thứ Năm",
  6: "Thứ Sáu",
  7: "Thứ Bảy",
};

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, Math.floor(secondsLeft));
  const mins = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function SubscriptionPendingPayment({
  subscriptionId,
  payment,
  subscriptionStatus,
  summary,
  apiPayReady,
  isSubmitting,
  isCancelling,
  checkingStatus,
  onRetryPayment,
  onCheckStatus,
  onCancel,
}) {
  const paymentUrl = payment?.pay_url || payment?.payment_url || "";
  const qrUrl = payment?.qr_url || "";
  const pkg = summary?.package || null;
  const address = summary?.address || null;
  const startDate = summary?.startDate || subscriptionStatus?.start_date || "";
  const deliveryDays = Array.isArray(summary?.deliveryDays) ? summary.deliveryDays : [];
  const totalAmount = Number(payment?.amount ?? pkg?.price ?? 0);

  const targetExpiryMs = useMemo(() => {
    if (payment?.expires_at) {
      const parsed = Date.parse(payment.expires_at);
      if (Number.isFinite(parsed)) return parsed;
    }
    const createdMs = Number(summary?._created_at_ms) || Date.now();
    return createdMs + 15 * 60 * 1000;
  }, [payment?.expires_at, summary?._created_at_ms]);

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
      {/* CỘT TRÁI: MÃ QR & THAO TÁC THANH TOÁN (7 CỘT) */}
      <section className="lg:col-span-7 rounded-3xl bg-white border border-[#c0c9bb]/50 p-6 sm:p-8 shadow-2xs text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-bold">
          Chờ xác nhận thanh toán ApiPay
        </span>

        <div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#191c1b] tracking-tight">
            Đăng ký gói #{subscriptionId}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5a6357]">
            Quét mã QR hoặc mở trang thanh toán ApiPay để kích hoạt gói rau định kỳ.
          </p>
        </div>

        {/* Khung tổng tiền & đếm ngược */}
        {totalAmount > 0 && (
          <div className="mx-auto max-w-md rounded-2xl bg-[#f1f8f2] border border-[#cce4cf] px-5 py-3.5 space-y-1">
            <p className="text-xs font-semibold text-[#41493e]">
              Tổng tiền cần thanh toán
            </p>
            <p className="text-2xl sm:text-3xl font-black text-[#006e1c] tabular-nums">
              {formatCurrencyVnd(totalAmount)}
            </p>
            {paymentUrl && (
              <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#7a5a18] pt-0.5 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {secondsLeft > 0
                    ? `Mã QR có hiệu lực trong ${formatCountdown(secondsLeft)}`
                    : "Mã QR đã hết hạn. Vui lòng lấy lại liên kết hoặc kiểm tra trạng thái."}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Ảnh mã QR ApiPay */}
        {qrUrl ? (
          <div className="mx-auto w-56 h-56 sm:w-60 sm:h-60 rounded-2xl bg-white p-3 border border-[#c0c9bb]/60 shadow-2xs flex items-center justify-center">
            <img
              src={qrUrl}
              alt={`Mã QR thanh toán ApiPay cho gói #${subscriptionId}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl bg-slate-50 border border-slate-200/80 p-5 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">
              Chưa hiển thị mã QR cho phiên giao dịch này.
            </p>
            <p>
              Nhấn nút <strong>Lấy liên kết thanh toán</strong> bên dưới để tải lại mã QR ApiPay.
            </p>
          </div>
        )}

        {/* Hàng nút thao tác */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 sm:px-5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-2xs transition-colors"
            >
              <span>Mở trang thanh toán ApiPay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onRetryPayment}
              disabled={isSubmitting || isCancelling || !apiPayReady}
              className="h-10 px-4 sm:px-5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{isSubmitting ? "Đang tải..." : "Lấy liên kết thanh toán"}</span>
            </button>
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
            disabled={checkingStatus || isCancelling}
            className="h-10 px-4 rounded-xl border border-[#c0c9bb]/80 bg-white hover:bg-[#f6f8f6] text-xs sm:text-sm font-bold text-[#191c1b] inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#006e1c] ${checkingStatus ? "animate-spin" : ""}`} />
            <span>Kiểm tra trạng thái</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isCancelling}
            className="h-10 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs sm:text-sm font-bold text-red-700 inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>{isCancelling ? "Đang hủy..." : "Hủy đăng ký"}</span>
          </button>
        </div>

        {/* Ghi chú tự động kiểm tra */}
        <div className="pt-2 border-t border-[#c0c9bb]/35 flex items-center justify-center gap-2 text-[11.5px] text-[#5a6357]">
          <ShieldCheck className="w-4 h-4 text-[#006e1c] shrink-0" />
          <p>
            <strong className="font-bold text-[#006e1c]">
              Hệ thống tự động kiểm tra trạng thái thanh toán.
            </strong>{" "}
            Gói định kỳ sẽ tự động kích hoạt ngay sau khi ApiPay xác nhận giao dịch.
          </p>
        </div>
      </section>

      {/* CỘT PHẢI: THÔNG TIN GIAO HÀNG & CHI TIẾT GÓI (5 CỘT) */}
      <aside className="lg:col-span-5 space-y-4">
        {/* Thẻ 1: Thông tin nhận hàng & Lịch giao */}
        <div className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 sm:p-6 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-[#00450d]">
            <Truck className="w-4 h-4 text-[#006e1c] shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#191c1b]">
              Thông tin nhận hàng & lịch giao
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
              Giao tới địa chỉ nhận hàng bạn đã đăng ký.
            </p>
          )}

          {(startDate || deliveryDays.length > 0) && (
            <div className="rounded-2xl bg-[#f6f8f6] border border-[#c0c9bb]/40 p-3.5 space-y-2 text-xs">
              {startDate && (
                <div className="flex items-center justify-between text-[#41493e]">
                  <span className="inline-flex items-center gap-1.5 text-[#5a6357]">
                    <CalendarDays className="w-3.5 h-3.5 text-[#006e1c]" />
                    Ngày bắt đầu nhận
                  </span>
                  <strong className="font-bold text-[#191c1b] tabular-nums">{startDate}</strong>
                </div>
              )}

              {deliveryDays.length > 0 && (
                <div className="pt-1.5 border-t border-[#c0c9bb]/35">
                  <p className="text-[#5a6357] mb-1.5">Lịch giao hằng tuần:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {deliveryDays.map((day) => (
                      <span
                        key={day.weekday}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-[#00450d]"
                      >
                        {WEEKDAY_LABELS[day.weekday] || `Thứ ${day.weekday}`} ·{" "}
                        {day.delivery_window}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thẻ 2: Chi tiết gói đăng ký */}
        <div className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 sm:p-6 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 text-[#00450d]">
            <Package className="w-4 h-4 text-[#006e1c] shrink-0" />
            <h3 className="text-sm sm:text-base font-extrabold text-[#191c1b]">
              Chi tiết gói đăng ký
            </h3>
          </div>

          {pkg ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[#191c1b]">{pkg.name}</p>
                <p className="text-xs text-[#5a6357]">
                  Định lượng {Number(pkg.weight_per_delivery)} kg/lần · Chu kỳ{" "}
                  {Number(pkg.duration_months)} tháng
                </p>
              </div>

              {Array.isArray(pkg.items) && pkg.items.length > 0 && (
                <div className="divide-y divide-[#c0c9bb]/30 border-t border-[#c0c9bb]/35 pt-2.5">
                  {pkg.items.map((item, idx) => (
                    <div
                      key={`${item.product_id ?? idx}-${idx}`}
                      className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-semibold text-[#191c1b] truncate">
                        {item.product_name}
                      </span>
                      <span className="font-bold text-[#00450d] tabular-nums shrink-0">
                        {Number(item.quantity)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-[#5a6357]">
              Gói rau củ hữu cơ giao định kỳ hằng tuần.
            </p>
          )}

          {totalAmount > 0 && (
            <div className="border-t border-[#c0c9bb]/45 pt-3 flex items-center justify-between text-sm sm:text-base font-extrabold text-[#191c1b]">
              <span>Tổng thanh toán</span>
              <span className="text-[#00450d] tabular-nums">
                {formatCurrencyVnd(totalAmount)}
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}