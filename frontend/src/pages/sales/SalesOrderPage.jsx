import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { showGlobalToast } from "../../components/GlobalToast";
import Pagination from "../../components/common/Pagination";
import SalesOrderCard from "../../components/sales/SalesOrderCard";
import SalesOrderFilters from "../../components/sales/SalesOrderFilters";
import DeliveryResultModal from "../../components/sales/modals/DeliveryResultModal";
import DispatchOrderModal from "../../components/sales/modals/DispatchOrderModal";
import { salesApi } from "../../services/salesApi";
import { notifyApiErrorToast } from "../../services/axiosClient";

export default function SalesOrderPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dispatchOrder, setDispatchOrder] = useState(null);
  const [deliveryResult, setDeliveryResult] = useState(null);

  useEffect(() => {
    let active = true;

    salesApi
      .getOrders({
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        page,
        per_page: 10,
      })
      .then((response) => {
        if (!active) return;
        setOrders(response.data || []);
        setMeta(response.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải danh sách đơn hàng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status, paymentMethod, page, refreshKey]);

  const updateStatus = (value) => {
    setLoading(true);
    setError("");
    setStatus(value);
    setPage(1);
    setNotice("");
  };

  const updatePaymentMethod = (value) => {
    setLoading(true);
    setError("");
    setPaymentMethod(value);
    setPage(1);
    setNotice("");
  };

  const runOrderAction = async (order, action, successMessage) => {
    const key = `${action}:${order.order_id}`;
    setBusyAction(key);
    setError("");
    setNotice("");
    try {
      if (action === "confirm") {
        await salesApi.confirmOrder(order.order_id);
      } else {
        await salesApi.confirmCodPayment(order.order_id);
      }
      setNotice(successMessage);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật đơn hàng.");
    } finally {
      setBusyAction("");
    }
  };

  const runDeliveryAction = async (order, action, payload) => {
    const key = action === "dispatch" ? `dispatch:${order.order_id}` : `delivery:${order.order_id}`;
    setBusyAction(key);
    setError("");
    try {
      if (action === "dispatch") {
        await salesApi.dispatchOrder(order.order_id, payload);
        showGlobalToast("Đã điều phối giao hàng và cập nhật trạng thái đơn.");
      } else if (action === "success") {
        const response = await salesApi.completeDelivery(order.order_id, payload);
        const earned = Number(response.data?.points_earned || 0);
        showGlobalToast(
          earned > 0
            ? `Đã xác nhận giao thành công và cộng ${earned} điểm thưởng cho khách.`
            : "Đã xác nhận giao hàng thành công."
        );
      } else {
        await salesApi.failDelivery(order.order_id, payload);
        showGlobalToast("Đã ghi nhận giao thất bại và xử lý tồn kho, thanh toán, điểm thưởng.");
      }

      setLoading(true);
      setRefreshKey((value) => value + 1);
      setDispatchOrder(null);
      setDeliveryResult(null);
      return true;
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật thông tin giao nhận.");
      notifyApiErrorToast(requestError, "Không thể cập nhật thông tin giao nhận.");
      return false;
    } finally {
      setBusyAction("");
    }
  };

  const codPending = (order) =>
    order.payments?.some(
      (payment) =>
        payment.method === "COD" &&
        ["Khoi_tao", "Cho_thanh_toan"].includes(payment.status)
    ) || false;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">
            Bán hàng & chăm sóc khách hàng
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#00450d]">
            <ClipboardList className="h-6 w-6" />
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-[#5a6357]">
            Phê duyệt đơn, điều phối giao nhận, chăm sóc khách hàng và xử lý tiền COD.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            setRefreshKey((value) => value + 1);
          }}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2 text-sm font-bold text-[#00450d] hover:bg-[#f2f4f2] disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </header>

      <SalesOrderFilters
        status={status}
        paymentMethod={paymentMethod}
        onStatusChange={updateStatus}
        onPaymentMethodChange={updatePaymentMethod}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-[#5a6357]">
        <span>{meta.total} đơn hàng</span>
        <span>{loading ? "Đang tải..." : `Trang ${meta.current_page} / ${meta.last_page}`}</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#c0c9bb]/40 bg-white py-14 text-center text-sm text-[#5a6357]">
          Đang tải danh sách đơn hàng...
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <SalesOrderCard
              key={order.order_id}
              order={order}
              busyAction={busyAction}
              onConfirm={(selectedOrder) =>
                runOrderAction(selectedOrder, "confirm", "Đơn hàng đã được phê duyệt.")
              }
              onConfirmCodPayment={(selectedOrder) =>
                runOrderAction(selectedOrder, "cod", "Đã ghi nhận thu tiền COD.")
              }
              onDispatch={setDispatchOrder}
              onDeliveryResult={(selectedOrder, mode) =>
                setDeliveryResult({ order: selectedOrder, mode })
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c0c9bb]/60 bg-white py-14 text-center text-sm text-[#5a6357]">
          Không tìm thấy đơn hàng phù hợp với bộ lọc.
        </div>
      )}

      <Pagination
        currentPage={meta.current_page}
        lastPage={meta.last_page}
        total={meta.total}
        perPage={meta.per_page}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        itemLabel="đơn hàng"
      />

      <DispatchOrderModal
        order={dispatchOrder}
        busy={busyAction === `dispatch:${dispatchOrder?.order_id}`}
        onClose={() => {
          if (!busyAction) setDispatchOrder(null);
        }}
        onSubmit={(payload) => runDeliveryAction(dispatchOrder, "dispatch", payload)}
      />
      <DeliveryResultModal
        order={deliveryResult?.order}
        mode={deliveryResult?.mode}
        codPending={deliveryResult ? codPending(deliveryResult.order) : false}
        busy={Boolean(busyAction)}
        onClose={() => {
          if (!busyAction) setDeliveryResult(null);
        }}
        onSubmit={(payload) =>
          runDeliveryAction(
            deliveryResult.order,
            deliveryResult.mode,
            payload
          )
        }
      />
    </div>
  );
}
