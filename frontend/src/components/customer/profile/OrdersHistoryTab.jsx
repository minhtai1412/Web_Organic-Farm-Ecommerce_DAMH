/* Tab quản lý đơn mua, gói định kỳ và khiếu nại bên trong Trung tâm tài khoản khách hàng. */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Package, RefreshCw } from "lucide-react";
import EmptyState from "../../common/EmptyState";
import { confirmGlobalDialog, showGlobalToast } from "../../GlobalToast";
import CreateClaimModal from "../modals/CreateClaimModal";
import ClaimHistoryCard from "../orders/ClaimHistoryCard";
import OrderHistoryCard from "../orders/OrderHistoryCard";
import SubscriptionHistoryCard from "../orders/SubscriptionHistoryCard";
import { ORDER_STATUS } from "../orders/orderHistoryUtils";
import { notifyApiErrorToast } from "../../../services/axiosClient";
import { customerApi } from "../../../services/customerApi";

export default function OrdersHistoryTab({ initialSubTab = "orders", onSubTabChange }) {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState(
    ["orders", "subscriptions", "claims"].includes(initialSubTab) ? initialSubTab : "orders"
  );
  const [orderStatus, setOrderStatus] = useState("");
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState(null);
  const [subscriptionsMeta, setSubscriptionsMeta] = useState(null);
  const [claimsMeta, setClaimsMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [changingSubscriptionId, setChangingSubscriptionId] = useState(null);
  const [continuingPaymentOrderId, setContinuingPaymentOrderId] = useState(null);
  const [claimOrder, setClaimOrder] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (["orders", "subscriptions", "claims"].includes(initialSubTab)) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSwitchSubTab = (nextSubTab) => {
    setSubTab(nextSubTab);
    onSubTabChange?.(nextSubTab);
  };

  const loadOrders = useCallback(
    async (page = 1, status = orderStatus, append = false) => {
      try {
        const response = await customerApi.getOrders({
          page,
          per_page: 10,
          ...(status ? { status } : {}),
        });
        setOrders((current) => (append ? [...current, ...response.data] : response.data));
        setOrdersMeta(response.meta);
        setLoadError("");
      } catch (error) {
        setLoadError(error.message || "Không thể tải lịch sử đơn hàng.");
      }
    },
    [orderStatus]
  );

  const loadSubscriptions = useCallback(async (page = 1, append = false) => {
    try {
      const response = await customerApi.getSubscriptions({ page, per_page: 10 });
      setSubscriptions((current) => (append ? [...current, ...response.data] : response.data));
      setSubscriptionsMeta(response.meta);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Không thể tải danh sách gói định kỳ.");
    }
  }, []);

  const loadClaims = useCallback(async (page = 1, append = false) => {
    try {
      const response = await customerApi.getClaims({ page, per_page: 10 });
      setClaims((current) => (append ? [...current, ...response.data] : response.data));
      setClaimsMeta(response.meta);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Không thể tải danh sách khiếu nại.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const load =
      subTab === "orders"
        ? loadOrders(1, orderStatus)
        : subTab === "subscriptions"
          ? loadSubscriptions(1)
          : loadClaims(1);
    load.finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [subTab, orderStatus, loadOrders, loadSubscriptions, loadClaims]);

  const loadMore = async () => {
    const meta =
      subTab === "orders"
        ? ordersMeta
        : subTab === "subscriptions"
          ? subscriptionsMeta
          : claimsMeta;
    if (!meta || meta.current_page >= meta.last_page) return;
    setLoadingMore(true);
    try {
      if (subTab === "orders") {
        await loadOrders(meta.current_page + 1, orderStatus, true);
      } else if (subTab === "subscriptions") {
        await loadSubscriptions(meta.current_page + 1, true);
      } else {
        await loadClaims(meta.current_page + 1, true);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleOrderDetails = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (orderDetails[orderId]) return;

    try {
      const response = await customerApi.getOrder(orderId);
      setOrderDetails((current) => ({ ...current, [orderId]: response.data }));
    } catch (error) {
      notifyApiErrorToast(error, "Không thể tải chi tiết đơn hàng.");
      setExpandedOrderId(null);
    }
  };

  const cancelOrder = async (order) => {
    const confirmed = await confirmGlobalDialog({
      title: "Hủy đơn hàng",
      message: `Bạn có chắc muốn hủy đơn hàng #${order.order_id}? Điểm đã sử dụng sẽ được hoàn lại nếu có.`,
      confirmLabel: "Hủy đơn",
      cancelLabel: "Quay lại",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const response = await customerApi.cancelRetailOrder(order.order_id);
      showGlobalToast(
        response.data.points_refunded > 0
          ? `Đã hủy đơn và hoàn ${response.data.points_refunded} điểm.`
          : "Đã hủy đơn hàng.",
        "success"
      );
      await loadOrders(1, orderStatus);
      setOrderDetails((current) => {
        const next = { ...current };
        delete next[order.order_id];
        return next;
      });
    } catch (error) {
      notifyApiErrorToast(error, "Không thể hủy đơn hàng.");
    }
  };

  const continueOrderPayment = async (order) => {
    if (continuingPaymentOrderId !== null) return;

    setContinuingPaymentOrderId(order.order_id);
    try {
      const response = await customerApi.checkout({ order_id: Number(order.order_id) });
      const payload = response.data?.data ?? response.data ?? {};

      if (payload.already_paid) {
        showGlobalToast("Đơn hàng đã thanh toán thành công và đang chờ xác nhận.", "success");
        await loadOrders(1, orderStatus);
        return;
      }

      const paymentUrl = payload.pay_url;
      if (!paymentUrl) {
        throw new Error("Không nhận được liên kết thanh toán. Vui lòng thử lại sau.");
      }

      const parsedPaymentUrl = new URL(paymentUrl);
      if (!["https:", "http:"].includes(parsedPaymentUrl.protocol)) {
        throw new Error("Liên kết thanh toán không hợp lệ. Vui lòng thử lại sau.");
      }

      window.location.assign(parsedPaymentUrl.href);
    } catch (error) {
      const detailMessage =
        Object.values(error?.fieldErrors || {})[0] ||
        error?.message ||
        "Không thể tiếp tục thanh toán đơn hàng.";
      showGlobalToast(detailMessage, "error");
    } finally {
      setContinuingPaymentOrderId(null);
    }
  };

  const changeSubscriptionStatus = async (subscription) => {
    const pausing = subscription.can_pause;
    const confirmed = await confirmGlobalDialog({
      title: pausing ? "Tạm ngưng gói" : "Tiếp tục gói",
      message: pausing
        ? "Lịch giao sẽ tạm dừng đến khi bạn tiếp tục. Ngày kết thúc gói vẫn giữ nguyên."
        : "Lịch giao của gói sẽ được kích hoạt lại.",
      confirmLabel: pausing ? "Tạm ngưng" : "Tiếp tục",
      cancelLabel: "Để sau",
      variant: pausing ? "danger" : "default",
    });
    if (!confirmed) return;

    setChangingSubscriptionId(subscription.subscription_id);
    try {
      if (pausing) {
        await customerApi.pauseSubscription(subscription.subscription_id);
      } else {
        await customerApi.resumeSubscription(subscription.subscription_id);
      }
      showGlobalToast(
        pausing ? "Đã tạm ngưng gói định kỳ." : "Đã tiếp tục gói định kỳ.",
        "success"
      );
      await loadSubscriptions(1);
    } catch (error) {
      notifyApiErrorToast(error, "Không thể cập nhật gói định kỳ.");
    } finally {
      setChangingSubscriptionId(null);
    }
  };

  const currentItems =
    subTab === "orders" ? orders : subTab === "subscriptions" ? subscriptions : claims;
  const currentMeta =
    subTab === "orders"
      ? ordersMeta
      : subTab === "subscriptions"
        ? subscriptionsMeta
        : claimsMeta;

  return (
    <div>
      {/* Tiêu đề & 3 Tab con */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#191c1b]">Đơn Mua Của Tôi</h2>
            <p className="text-xs text-[#5a6357] mt-0.5">
              Theo dõi đơn mua, chi tiết thanh toán, gói định kỳ và khiếu nại
            </p>
          </div>

          {subTab === "subscriptions" && (
            <Link
              to="/subscriptions"
              className="rounded-xl bg-[#00450d] hover:bg-[#006e1c] px-3.5 py-2 text-xs font-bold text-white transition-colors"
            >
              + Đăng ký gói mới
            </Link>
          )}

          {subTab === "orders" && (
            <label className="text-xs text-slate-600">
              <span className="sr-only">Lọc trạng thái đơn hàng</span>
              <select
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value)}
                className="h-9 rounded-xl border border-slate-300 bg-[#f8faf8] px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#006e1c] focus:bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(ORDER_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Thanh chuyển 3 tab con */}
        <div className="mt-4 flex gap-1 border-b border-slate-100 -mb-4">
          {[
            ["orders", "Tất cả đơn hàng"],
            ["subscriptions", "Gói định kỳ"],
            ["claims", "Khiếu nại"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => handleSwitchSubTab(tabKey)}
              className={`border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                subTab === tabKey
                  ? "border-[#006e1c] text-[#006e1c]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách nội dung */}
      <div className="pt-5">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-[#006e1c]" aria-label="Đang tải" />
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            <p>{loadError}</p>
            <button
              type="button"
              className="mt-3 font-bold underline cursor-pointer"
              onClick={() =>
                subTab === "orders"
                  ? loadOrders()
                  : subTab === "subscriptions"
                    ? loadSubscriptions()
                    : loadClaims()
              }
            >
              Thử tải lại
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          <EmptyState
            icon={subTab === "orders" ? Package : CalendarDays}
            title={
              subTab === "orders"
                ? "Chưa có đơn hàng"
                : subTab === "subscriptions"
                  ? "Chưa đăng ký gói định kỳ"
                  : "Chưa có khiếu nại"
            }
            message={
              subTab === "orders"
                ? "Các đơn mua của bạn sẽ hiển thị tại đây."
                : subTab === "subscriptions"
                  ? "Đăng ký một gói để theo dõi lịch giao và trạng thái tại đây."
                  : "Khiếu nại gửi về đơn hàng đã hoàn thành sẽ được theo dõi tại đây."
            }
            actionLabel={
              subTab === "orders"
                ? "Khám phá sản phẩm"
                : subTab === "subscriptions"
                  ? "Xem các gói rau"
                  : ""
            }
            onAction={() => navigate(subTab === "orders" ? "/products" : "/subscriptions")}
          />
        ) : (
          <div className="space-y-4">
            {subTab === "claims"
              ? claims.map((claim) => <ClaimHistoryCard key={claim.claim_id} claim={claim} />)
              : subTab === "orders"
                ? orders.map((order) => (
                    <OrderHistoryCard
                      key={order.order_id}
                      order={order}
                      details={orderDetails[order.order_id]}
                      expanded={expandedOrderId === order.order_id}
                      onToggleDetails={toggleOrderDetails}
                      onCancelOrder={cancelOrder}
                      onContinuePayment={continueOrderPayment}
                      isContinuingPayment={continuingPaymentOrderId === order.order_id}
                      onOpenClaim={setClaimOrder}
                      onSwitchToClaimsTab={() => handleSwitchSubTab("claims")}
                    />
                  ))
                : subscriptions.map((subscription) => (
                    <SubscriptionHistoryCard
                      key={subscription.subscription_id}
                      subscription={subscription}
                      isChanging={changingSubscriptionId === subscription.subscription_id}
                      onToggleStatus={changeSubscriptionStatus}
                      onViewOrders={() => handleSwitchSubTab("orders")}
                    />
                  ))}

            {currentMeta && currentMeta.current_page < currentMeta.last_page && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {loadingMore && <RefreshCw className="h-4 w-4 animate-spin" />}
                Tải thêm
              </button>
            )}
          </div>
        )}
      </div>

      {claimOrder && (
        <CreateClaimModal
          order={claimOrder}
          onClose={() => setClaimOrder(null)}
          onSubmitted={async () => {
            setClaimOrder(null);
            showGlobalToast(
              "Đã gửi khiếu nại. Bạn có thể theo dõi tiến độ trong mục Khiếu nại.",
              "success"
            );
            await Promise.all([loadOrders(1, orderStatus), loadClaims(1)]);
          }}
        />
      )}
    </div>
  );
}