/* Thẻ hiển thị từng đơn hàng: liên kết tới trang chi tiết sản phẩm, bóc tách tiền rõ ràng và mở rộng chi tiết. */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Leaf,
  Truck,
} from "lucide-react";
import {
  CLAIM_STATUS,
  ORDER_STATUS,
  ORDER_TYPE,
  OrderStatusBadge,
  formatOrderDateTime,
  formatOrderMoney,
} from "./orderHistoryUtils";

function OrderProductThumb({ image, name }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setFailed(true)}
        className="h-13 w-13 rounded-xl object-cover border border-slate-200/80 shrink-0 group-hover/item:scale-105 transition-transform"
      />
    );
  }

  return (
    <span className="flex h-13 w-13 items-center justify-center rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-[#006e1c] shrink-0">
      <Leaf className="h-5 w-5" />
    </span>
  );
}

export default function OrderHistoryCard({
  order,
  details,
  expanded,
  onToggleDetails,
  onCancelOrder,
  onContinuePayment,
  isContinuingPayment,
  onOpenClaim,
  onSwitchToClaimsTab,
}) {
  const isZeroChargeOrder =
    order.order_type === "Giao_bu" || order.order_type === "Dinh_ky";

  const calculatedItemsSubtotal = (order.items || []).reduce(
    (sum, item) => sum + Number(item.line_total || 0),
    0
  );
  const subtotal = Number(order.subtotal ?? calculatedItemsSubtotal);
  const shippingFee = Number(order.shipping_fee ?? 0);
  const pointsDiscount = Number(order.points_discount ?? 0);
  const finalTotal = Number(order.total ?? 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
      {/* Header thẻ đơn */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#fafbfa] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm">
          <span className="font-extrabold text-slate-900">Đơn #{order.order_id}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {ORDER_TYPE[order.order_type] || order.order_type}
          </span>
          <span className="text-slate-500">{formatOrderDateTime(order.ordered_at)}</span>
          <OrderStatusBadge status={order.status} labels={ORDER_STATUS} />
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-500 block">
            Tổng thanh toán
          </span>
          <span className="text-base font-black text-[#006e1c] tabular-nums">
            {formatOrderMoney(finalTotal)}
          </span>
        </div>
      </div>

      <div className="space-y-3.5 px-5 py-4">
        {/* Danh sách sản phẩm trong đơn — bấm vào chuyển sang trang chi tiết sản phẩm */}
        <div className="divide-y divide-slate-100">
          {(order.items || []).map((item, index) => {
            const hasProductLink = Number(item.product_id) > 0;
            const isComplimentary =
              isZeroChargeOrder && Number(item.unit_price || 0) === 0;

            const itemContent = (
              <>
                <OrderProductThumb image={item.image} name={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 group-hover/item:text-[#006e1c] transition-colors inline-flex items-center gap-1.5 max-w-full">
                    <span className="truncate">{item.name}</span>
                    {hasProductLink && (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/item:opacity-100 text-[#006e1c] transition-opacity" />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    {isComplimentary ? (
                      <span>
                        Số lượng:{" "}
                        <strong className="text-slate-700">
                          {item.quantity} {item.unit || ""}
                        </strong>{" "}
                        ·{" "}
                        <span className="font-semibold text-[#006e1c]">
                          {order.order_type === "Giao_bu"
                            ? "Đơn giao bù miễn phí"
                            : "Thuộc gói định kỳ (đã thanh toán trọn gói)"}
                        </span>
                      </span>
                    ) : (
                      <span>
                        {item.quantity} {item.unit || ""} ×{" "}
                        {formatOrderMoney(item.unit_price)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">
                  {isComplimentary ? "0 đ" : formatOrderMoney(item.line_total)}
                </span>
              </>
            );

            return hasProductLink ? (
              <Link
                key={`${item.product_id}-${index}`}
                to={`/products/${item.product_id}`}
                title={`Xem chi tiết sản phẩm ${item.name}`}
                className="group/item flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0 rounded-xl hover:bg-[#f6f8f6] -mx-2 px-2 transition-colors"
              >
                {itemContent}
              </Link>
            ) : (
              <div
                key={`${item.product_id}-${index}`}
                className="flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0"
              >
                {itemContent}
              </div>
            );
          })}
        </div>

        {/* Bảng bóc tách tính tiền rõ ràng */}
        <div className="rounded-xl bg-[#f8faf8] border border-slate-200/70 px-4 py-3 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
            <span>Tiền hàng ({order.items?.length || 0} mặt hàng)</span>
            <span className="font-bold text-slate-800 tabular-nums">
              {formatOrderMoney(subtotal)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
            <span>
              Phí giao hàng
              {Number(order.distance_km) > 0
                ? ` (${Number(order.distance_km)} km)`
                : ""}
            </span>
            <span className="font-bold text-slate-800 tabular-nums">
              {shippingFee > 0 ? `+ ${formatOrderMoney(shippingFee)}` : "0 đ"}
            </span>
          </div>

          {pointsDiscount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#006e1c]">
              <span>Giảm từ điểm thưởng ({order.points_used} điểm)</span>
              <span className="font-bold tabular-nums">
                - {formatOrderMoney(pointsDiscount)}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-1.5 text-sm font-extrabold text-slate-900">
            <span>Tổng thanh toán</span>
            <span className="text-[#006e1c] tabular-nums">
              {formatOrderMoney(finalTotal)}
            </span>
          </div>
        </div>

        {/* Chân thẻ: Địa chỉ / Vận đơn & Các nút thao tác */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm">
          <span className="text-slate-500">
            {order.delivery?.tracking_number
              ? `Vận đơn: ${order.delivery.tracking_number}`
              : order.address?.detail || "Chưa có thông tin giao hàng"}
          </span>
          <div className="flex flex-wrap gap-2">
            {order.status === "Cho_thanh_toan" && onContinuePayment && (
              <button
                type="button"
                disabled={isContinuingPayment}
                onClick={() => onContinuePayment(order)}
                className="rounded-lg bg-[#00450d] hover:bg-[#006e1c] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                {isContinuingPayment ? "Đang mở ApiPay..." : "Thanh toán ApiPay"}
              </button>
            )}
            {order.can_claim && (
              <button
                type="button"
                onClick={() => onOpenClaim(order)}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 cursor-pointer"
              >
                Gửi khiếu nại
              </button>
            )}
            {order.can_cancel && (
              <button
                type="button"
                onClick={() => onCancelOrder(order)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 cursor-pointer"
              >
                Hủy đơn
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleDetails(order.order_id)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Chi tiết{" "}
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {(order.claims || []).map((claim) => (
          <div
            key={claim.claim_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs"
          >
            <span className="font-semibold text-amber-900">
              Khiếu nại #{claim.claim_id}:{" "}
              {CLAIM_STATUS[claim.status] || claim.status}
            </span>
            <button
              type="button"
              onClick={onSwitchToClaimsTab}
              className="font-bold text-emerald-800 underline cursor-pointer"
            >
              Theo dõi
            </button>
          </div>
        ))}

        {expanded && (
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 border border-slate-200/70">
            {!details ? (
              <p className="text-slate-500">Đang tải chi tiết đơn hàng…</p>
            ) : (
              <>
                <div>
                  <h2 className="mb-2 font-bold text-slate-800">
                    Thông tin thanh toán
                  </h2>
                  {details.payments.length ? (
                    details.payments.map((payment, index) => (
                      <p
                        key={`${payment.method}-${index}`}
                        className="text-slate-600"
                      >
                        {payment.method} · {payment.status} ·{" "}
                        {formatOrderMoney(payment.amount)}
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-500">
                      Chưa có giao dịch thanh toán trực tuyến.
                    </p>
                  )}
                  <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                    <p>Tiền hàng: {formatOrderMoney(details.subtotal)}</p>
                    <p>
                      Phí giao hàng: {formatOrderMoney(details.shipping_fee)} (
                      {details.distance_km} km)
                    </p>
                    {details.points_used > 0 && (
                      <p className="text-[#006e1c] font-semibold">
                        Điểm sử dụng: {details.points_used} điểm (giảm{" "}
                        {formatOrderMoney(details.points_discount)})
                      </p>
                    )}
                    <p className="font-bold text-slate-900 pt-0.5">
                      Tổng cộng: {formatOrderMoney(details.total)}
                    </p>
                  </div>
                </div>
                <div>
                  <h2 className="mb-2 font-bold text-slate-800">
                    Thông tin giao hàng
                  </h2>
                  <p className="text-slate-600">
                    {details.address?.recipient_name} · {details.address?.phone}
                  </p>
                  <p className="text-slate-600">{details.address?.detail}</p>
                  {details.delivery && (
                    <p className="mt-1 inline-flex items-center gap-1 text-slate-600">
                      <Truck className="h-4 w-4" />
                      {details.delivery.carrier || "Đơn vị vận chuyển"} ·{" "}
                      {details.delivery.status}
                    </p>
                  )}
                  {details.note && (
                    <p className="mt-2 text-slate-600">Ghi chú: {details.note}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}