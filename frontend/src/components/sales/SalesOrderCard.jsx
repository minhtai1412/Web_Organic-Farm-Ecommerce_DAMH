import {
  Banknote,
  Check,
  CircleCheck,
  CircleX,
  MapPin,
  PackageCheck,
  Truck,
  UserRound,
} from "lucide-react";
import Badge from "../common/Badge";

const STATUS_LABELS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const STATUS_VARIANTS = {
  Cho_thanh_toan: "warning",
  Cho_xac_nhan: "warning",
  Da_xac_nhan: "primary",
  Dang_giao: "primary",
  Hoan_thanh: "success",
  Da_huy: "danger",
};

const DELIVERY_STATUS_LABELS = {
  Chuan_bi: "Chuẩn bị",
  Dang_giao: "Đang giao",
  Giao_thanh_cong: "Giao thành công",
  Giao_that_bai: "Giao thất bại",
};

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const paymentLabel = (method) =>
  ({
    ApiPay: "ApiPay",
    COD: "COD",
    Mien_phi_goi: "Miễn phí gói",
    Giao_bu: "Giao bù",
  })[method] || method;

export default function SalesOrderCard({
  order,
  busyAction,
  onConfirm,
  onConfirmCodPayment,
  onDispatch,
  onDeliveryResult,
}) {
  const payment = order.payments?.[0];
  const confirmBusy = busyAction === `confirm:${order.order_id}`;
  const codBusy = busyAction === `cod:${order.order_id}`;
  const dispatchBusy = busyAction === `dispatch:${order.order_id}`;
  const deliveryBusy = busyAction === `delivery:${order.order_id}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#c0c9bb]/40 bg-white shadow-xs">
      <header className="flex flex-col gap-3 border-b border-[#c0c9bb]/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-[#00450d]">Đơn hàng #{order.order_id}</h2>
          <Badge variant={STATUS_VARIANTS[order.status] || "neutral"}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
          <Badge variant="neutral">{paymentLabel(payment?.method) || "Chưa có thanh toán"}</Badge>
        </div>
        <time className="text-xs text-[#5a6357]">{dateTime(order.ordered_at)}</time>
      </header>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-2 text-sm text-[#41493e] sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#006e1c]" />
              <span>
                <strong className="text-[#191c1b]">{order.customer?.name || "Khách hàng"}</strong>
                <span className="block text-xs">{order.customer?.phone || order.customer?.email}</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#006e1c]" />
              <span className="min-w-0">
                <strong className="text-[#191c1b]">{order.address?.recipient_name || "Địa chỉ nhận hàng"}</strong>
                <span className="block break-words text-xs">{order.address?.detail || "Không có địa chỉ"}</span>
              </span>
            </p>
          </div>

          <ul className="divide-y divide-[#c0c9bb]/20 rounded-xl bg-[#f8faf8] px-3">
            {(order.items || []).map((item) => (
              <li key={item.product_id} className="py-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#191c1b]">
                    {item.name} <span className="font-normal text-[#5a6357]">× {item.quantity} {item.unit}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{currency.format(item.line_total)}</span>
                </div>
                {item.allocations?.length > 0 && (
                  <p className="mt-1 text-xs text-[#5a6357]">
                    Lô FEFO:{" "}
                    {item.allocations
                      .map((allocation) =>
                        `#${allocation.batch_id} (${allocation.quantity}${item.unit ? ` ${item.unit}` : ""}, HSD ${allocation.expiry_date || "—"})`
                      )
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {order.note && (
            <p className="text-xs text-[#5a6357]">
              Ghi chú: <span className="text-[#191c1b]">{order.note}</span>
            </p>
          )}
          {order.delivery && (
            <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sm">
              <h3 className="flex items-center gap-2 font-bold text-sky-950">
                <Truck className="h-4 w-4" aria-hidden="true" />
                Thông tin giao nhận
              </h3>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-700 sm:grid-cols-2">
                <div><dt className="inline font-semibold">Đơn vị vận chuyển: </dt><dd className="inline">{order.delivery.carrier || "—"}</dd></div>
                <div><dt className="inline font-semibold">Mã vận đơn: </dt><dd className="inline break-all">{order.delivery.tracking_number || "—"}</dd></div>
                <div><dt className="inline font-semibold">Trạng thái giao: </dt><dd className="inline">{DELIVERY_STATUS_LABELS[order.delivery.status] || order.delivery.status || "—"}</dd></div>
                <div><dt className="inline font-semibold">Ngày xuất giao: </dt><dd className="inline">{dateTime(order.delivery.shipped_at)}</dd></div>
                {order.delivery.delivered_at && (
                  <div><dt className="inline font-semibold">Ngày giao thành công: </dt><dd className="inline">{dateTime(order.delivery.delivered_at)}</dd></div>
                )}
              </dl>
              {order.delivery.dispatch_note && (
                <p className="mt-2 text-xs text-slate-700">Ghi chú điều phối: {order.delivery.dispatch_note}</p>
              )}
              {order.delivery.failure_reason && (
                <p className="mt-2 text-xs font-semibold text-red-800">
                  Lý do giao thất bại: {order.delivery.failure_reason}
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col justify-between gap-4 border-t border-[#c0c9bb]/25 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3 text-[#5a6357]">
              <dt>Tiền hàng</dt>
              <dd>{currency.format(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-[#5a6357]">
              <dt>Phí giao hàng</dt>
              <dd>{currency.format(order.shipping_fee)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#c0c9bb]/25 pt-2 font-bold text-[#00450d]">
              <dt>Tổng cộng</dt>
              <dd>{currency.format(order.total)}</dd>
            </div>
            {payment && (
              <div className="flex items-center justify-between gap-3 text-xs text-[#5a6357]">
                <dt>Thanh toán</dt>
                <dd>{payment.status === "Thanh_cong" ? "Đã thanh toán" : "Chưa thu tiền"}</dd>
              </div>
            )}
          </dl>

          <div className="grid gap-2">
            {order.can_confirm && (
              <button
                type="button"
                onClick={() => onConfirm(order)}
                disabled={Boolean(busyAction)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#00450d] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#006e1c] disabled:cursor-wait disabled:opacity-60"
              >
                <PackageCheck className="h-4 w-4" />
                {confirmBusy ? "Đang phê duyệt..." : "Phê duyệt đơn"}
              </button>
            )}
            {order.can_confirm_cod_collection && (
              <button
                type="button"
                onClick={() => onConfirmCodPayment(order)}
                disabled={Boolean(busyAction)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
              >
                <Banknote className="h-4 w-4" />
                {codBusy ? "Đang ghi nhận..." : "Xác nhận đã thu COD"}
                {!codBusy && <Check className="h-4 w-4" />}
              </button>
            )}
            {order.status === "Da_xac_nhan" && (
              <button
                type="button"
                onClick={() => onDispatch(order)}
                disabled={Boolean(busyAction)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#08712b] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#075b25] disabled:cursor-wait disabled:opacity-60"
              >
                <Truck className="h-4 w-4" />
                {dispatchBusy ? "Đang điều phối..." : "Điều phối giao hàng"}
              </button>
            )}
            {order.status === "Dang_giao" && (
              <>
                <button
                  type="button"
                  onClick={() => onDeliveryResult(order, "success")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  <CircleCheck className="h-4 w-4" />
                  {deliveryBusy ? "Đang cập nhật..." : "Giao thành công"}
                </button>
                <button
                  type="button"
                  onClick={() => onDeliveryResult(order, "failure")}
                  disabled={Boolean(busyAction)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <CircleX className="h-4 w-4" />
                  Giao thất bại
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
