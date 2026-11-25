/* Trang lịch sử đơn hàng của khách hàng: đầu trang cố định gọn nhẹ và điều phối 3 tab Đơn hàng, Gói định kỳ, Khiếu nại. */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Award, CalendarDays, Package, Receipt, RefreshCw } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import { confirmGlobalDialog, showGlobalToast } from "../../components/GlobalToast";
import CreateClaimModal from "../../components/customer/modals/CreateClaimModal";
import ClaimHistoryCard from "../../components/customer/orders/ClaimHistoryCard";
import OrderHistoryCard from "../../components/customer/orders/OrderHistoryCard";
import SubscriptionHistoryCard from "../../components/customer/orders/SubscriptionHistoryCard";
import { ORDER_STATUS } from "../../components/customer/orders/orderHistoryUtils";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { customerApi } from "../../services/customerApi";

export default function OrderHistoryPage() {
const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    ["orders", "subscriptions", "claims"].includes(initialTab) ? initialTab : "orders"
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
      activeTab === "orders"
        ? loadOrders(1, orderStatus)
        : activeTab === "subscriptions"
          ? loadSubscriptions(1)
          : loadClaims(1);
    load.finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeTab, orderStatus, loadOrders, loadSubscriptions, loadClaims]);

  const loadMore = async () => {
    const meta =
      activeTab === "orders"
        ? ordersMeta
        : activeTab === "subscriptions"
          ? subscriptionsMeta
          : claimsMeta;
    if (!meta || meta.current_page >= meta.last_page) return;
    setLoadingMore(true);
    try {
      if (activeTab === "orders") {
        await loadOrders(meta.current_page + 1, orderStatus, true);
      } else if (activeTab === "subscriptions") {
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
    activeTab === "orders" ? orders : activeTab === "subscriptions" ? subscriptions : claims;
  const currentMeta =
    activeTab === "orders"
      ? ordersMeta
      : activeTab === "subscriptions"
        ? subscriptionsMeta
        : claimsMeta;

  return (
    <main className="min-h-screen bg-[#f6f8f6] pb-12">
      {/* 1. Đầu trang + Tab + Bộ lọc cố định, thu gọn chiều cao */}
      <header className="sticky top-20 z-20 bg-white/95 backdrop-blur-md border-b border-[#c0c9bb]/45 shadow-2xs">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#00450d] text-white flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-[#91f78e]" />
              </div>
              <div className="min-w-0 flex flex-wrap items-baseline gap-x-2.5">
                <h1
                  className="text-lg sm:text-xl font-extrabold text-[#00450d] tracking-tight truncate"
                  style={{ fontFamily: "var(--font-headline)" }}
                >
                  Đơn hàng của tôi
                </h1>
                <span className="hidden sm:inline text-xs text-[#5a6357] truncate">
                  Theo dõi đơn mua, chi tiết thanh toán và lịch giao gói định kỳ
                </span>
              </div>
            </div>

            <Link
              to="/rewards?tab=rewards"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3 py-1.5 text-xs font-extrabold text-amber-900 transition-colors shrink-0"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Ví điểm thưởng</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {[
                ["orders", "Tất cả đơn hàng"],
                ["subscriptions", "Gói định kỳ"],
                ["claims", "Khiếu nại"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-3.5 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "border-[#006e1c] text-[#006e1c]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "subscriptions" && (
              <Link
                to="/subscriptions"
                className="mb-1.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                + Đăng ký gói mới
              </Link>
            )}

            {activeTab === "orders" && (
              <label className="mb-1.5 text-xs text-slate-600">
                <span className="sr-only">Lọc trạng thái đơn hàng</span>
                <select
                  value={orderStatus}
                  onChange={(event) => setOrderStatus(event.target.value)}
                  className="h-8.5 rounded-xl border border-slate-300 bg-[#f8faf8] px-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#006e1c] focus:bg-white"
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
        </div>
      </header>

      {/* 2. Danh sách nội dung bên dưới */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-5">
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
                activeTab === "orders"
                  ? loadOrders()
                  : activeTab === "subscriptions"
                    ? loadSubscriptions()
                    : loadClaims()
              }
            >
              Thử tải lại
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          <EmptyState
            icon={activeTab === "orders" ? Package : CalendarDays}
            title={
              activeTab === "orders"
                ? "Chưa có đơn hàng"
                : activeTab === "subscriptions"
                  ? "Chưa đăng ký gói định kỳ"
                  : "Chưa có khiếu nại"
            }
            message={
              activeTab === "orders"
                ? "Các đơn mua của bạn sẽ hiển thị tại đây."
                : activeTab === "subscriptions"
                  ? "Đăng ký một gói để theo dõi lịch giao và trạng thái tại đây."
                  : "Khiếu nại gửi về đơn hàng đã hoàn thành sẽ được theo dõi tại đây."
            }
            actionLabel={
              activeTab === "orders"
                ? "Khám phá sản phẩm"
                : activeTab === "subscriptions"
                  ? "Xem các gói rau"
                  : ""
            }
            onAction={() => navigate(activeTab === "orders" ? "/products" : "/subscriptions")}
          />
        ) : (
          <div className="space-y-4">
            {activeTab === "claims"
              ? claims.map((claim) => (
                  <ClaimHistoryCard key={claim.claim_id} claim={claim} />
                ))
              : activeTab === "orders"
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
                      onSwitchToClaimsTab={() => setActiveTab("claims")}
                    />
                  ))
                : subscriptions.map((subscription) => (
                    <SubscriptionHistoryCard
                      key={subscription.subscription_id}
                      subscription={subscription}
                      isChanging={changingSubscriptionId === subscription.subscription_id}
                      onToggleStatus={changeSubscriptionStatus}
                      onViewOrders={() => setActiveTab("orders")}
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
    </main>
  );
}