/* Trang thanh toán đơn hàng: tiêu đề cố định, danh sách sản phẩm đứng yên bên trái, cột phải cuộn độc lập. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CreditCard, ShoppingBag } from "lucide-react";
import CheckoutDeliveryAndPayment from "../../components/customer/checkout/CheckoutDeliveryAndPayment";
import CheckoutItemList from "../../components/customer/checkout/CheckoutItemList";
import CheckoutPendingPayment from "../../components/customer/checkout/CheckoutPendingPayment";
import CheckoutSummaryCard from "../../components/customer/checkout/CheckoutSummaryCard";
import { showGlobalToast } from "../../components/GlobalToast";
import { useCart } from "../../context/useCart";
import { customerApi } from "../../services/customerApi";

const PENDING_ORDER_STORAGE_KEY = "xanhfarm_pending_checkout_order";

function loadSavedPendingOrder() {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && (parsed.order_id || parsed.id) ? parsed : null;
  } catch {
    return null;
  }
}

function savePendingOrder(orderData) {
  try {
    if (!orderData) {
      sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, JSON.stringify(orderData));
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }
}

function createIdempotencyKey() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function apiErrorMessage(error, fallback = "Không thể xử lý thanh toán. Vui lòng thử lại.") {
  const fieldMessages = Object.values(
    error?.fieldErrors ?? error?.response?.data?.errors ?? {}
  ).flat();
  return (
    fieldMessages[0] ||
    error?.message ||
    error?.response?.data?.message ||
    fallback
  );
}

function extractRewardInfo(optionsData = {}, rewardData = {}) {
  const summary = rewardData?.summary ?? rewardData?.wallet ?? {};

  const rawPoints =
    optionsData?.available_points ??
    optionsData?.current_points ??
    optionsData?.points_balance ??
    rewardData?.available_points ??
    rewardData?.current_points ??
    rewardData?.total_points ??
    rewardData?.balance ??
    rewardData?.points ??
    rewardData?.so_du_diem ??
    summary?.available_points ??
    summary?.current_points ??
    summary?.total_points ??
    summary?.balance ??
    0;

  const rawRate =
    optionsData?.diem_quy_doi_vnd ??
    optionsData?.point_vnd_rate ??
    optionsData?.point_value_vnd ??
    optionsData?.conversion_rate ??
    rewardData?.diem_quy_doi_vnd ??
    rewardData?.point_vnd_rate ??
    rewardData?.conversion_rate ??
    summary?.diem_quy_doi_vnd ??
    summary?.conversion_rate ??
    1000;

  const points = Math.max(0, Math.floor(Number(rawPoints) || 0));
  const rate = Number(rawRate) > 0 ? Number(rawRate) : 1000;

  return { points, rate };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items = [], isLoading: cartLoading, refreshCart } = useCart();

  // Dữ liệu địa chỉ, điểm thưởng & cấu hình cổng thanh toán
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointVndRate, setPointVndRate] = useState(1000);
  const [useRewardPoints, setUseRewardPoints] = useState(false);
  const [pointsInput, setPointsInput] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("ApiPay");
  const [note, setNote] = useState("");
  const [apiPayReady, setApiPayReady] = useState(true);

  // Báo giá vận chuyển & tổng tiền từ server
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Trạng thái khởi tạo & thanh toán đơn hàng
  const [bootLoading, setBootLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  // Trạng thái đơn hàng đã tạo đang chờ thanh toán ApiPay (khôi phục được khi F5)
  const [createdOrder, setCreatedOrder] = useState(() => loadSavedPendingOrder());
  const [checkingPayment, setCheckingPayment] = useState(false);

  const normalizedItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((raw) => {
      const product = raw.product || {};
      const productId = raw.product_id ?? product.id ?? raw.id;
      const name = raw.name ?? product.name ?? "Nông sản hữu cơ";
      const unit = raw.unit ?? product.unit ?? "kg";
      const categoryName =
        raw.category?.name ?? raw.category_name ?? product.category?.name ?? "";
      const unitPrice = Number(
        raw.unit_price ??
          raw.effective_price ??
          raw.price ??
          product.effective_price ??
          product.price ??
          0
      );
      const quantity = Math.max(0, Number(raw.quantity ?? 1) || 1);
      const subtotal = Number(raw.subtotal ?? unitPrice * quantity);

      return {
        raw,
        productId,
        name,
        unit,
        categoryName,
        unitPrice,
        quantity,
        subtotal,
      };
    });
  }, [items]);

  const itemsSubtotal = useMemo(
    () => Math.round(normalizedItems.reduce((sum, item) => sum + item.subtotal, 0)),
    [normalizedItems]
  );

  const selectedAddress = useMemo(
    () => addresses.find((addr) => String(addr.id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId]
  );

  const maxRedeemablePoints = useMemo(() => {
    if (availablePoints <= 0 || pointVndRate <= 0 || itemsSubtotal <= 0) return 0;
    const maxBySubtotal = Math.floor(itemsSubtotal / pointVndRate);
    return Math.max(0, Math.min(availablePoints, maxBySubtotal));
  }, [availablePoints, pointVndRate, itemsSubtotal]);

  const appliedPoints = useMemo(() => {
    if (!useRewardPoints || maxRedeemablePoints <= 0) return 0;
    const parsed = Math.floor(Number(pointsInput) || 0);
    if (parsed <= 0) return maxRedeemablePoints;
    return Math.min(parsed, maxRedeemablePoints);
  }, [useRewardPoints, pointsInput, maxRedeemablePoints]);

  // Tải địa chỉ, điểm thưởng và cấu hình quy đổi điểm từ CSDL
  const loadInitialCheckoutData = useCallback(async () => {
    setBootLoading(true);
    try {
      const [addrRes, optionsRes, rewardRes] = await Promise.allSettled([
        customerApi.getAddresses(),
        customerApi.getCheckoutOptions(),
        customerApi.getRewardPoints({ per_page: 1 }),
      ]);

      if (addrRes.status === "fulfilled") {
        const addrList = addrRes.value?.data?.data ?? addrRes.value?.data ?? [];
        const safeList = Array.isArray(addrList) ? addrList : [];
        setAddresses(safeList);
        const defaultAddr = safeList.find((item) => item.is_default) || safeList[0] || null;
        if (defaultAddr) setSelectedAddressId(String(defaultAddr.id));
      }

      const optData =
        optionsRes.status === "fulfilled"
          ? optionsRes.value?.data?.data ?? optionsRes.value?.data ?? {}
          : {};
      const rewardData =
        rewardRes.status === "fulfilled"
          ? rewardRes.value?.data?.data ?? rewardRes.value?.data ?? {}
          : {};

      if (optionsRes.status === "fulfilled") {
        setApiPayReady(optData.ready !== undefined ? Boolean(optData.ready) : true);
      }

      const { points, rate } = extractRewardInfo(optData, rewardData);
      setAvailablePoints(points);
      setPointVndRate(rate);
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialCheckoutData();
  }, [loadInitialCheckoutData]);

  // Tính báo giá phí giao hàng & giảm giá mỗi khi đổi địa chỉ hoặc điểm thưởng
  useEffect(() => {
    if (!selectedAddressId || normalizedItems.length === 0) {
      setQuote(null);
      return undefined;
    }

    let active = true;
    setQuoteLoading(true);
    setQuoteError("");

    customerApi
      .getCheckoutQuote({
        address_id: Number(selectedAddressId),
        points_to_use: appliedPoints,
      })
      .then((res) => {
        if (!active) return;
        const payload = res?.data?.data ?? res?.data ?? null;
        setQuote(payload);

        if (payload) {
          if (payload.available_points !== undefined) {
            setAvailablePoints(Math.max(0, Math.floor(Number(payload.available_points) || 0)));
          }
          const serverRate =
            payload.diem_quy_doi_vnd ?? payload.point_vnd_rate ?? payload.conversion_rate;
          if (Number(serverRate) > 0) {
            setPointVndRate(Number(serverRate));
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setQuoteError(apiErrorMessage(err, "Không thể tính phí vận chuyển cho địa chỉ này."));
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedAddressId, appliedPoints, normalizedItems.length]);

  const distanceKm = Number(quote?.distance_km ?? 0);
  const pricePerKm = Number(quote?.price_per_km ?? 2000);
  const originName = quote?.origin_name || "Nhà C - Trường Cao đẳng Kỹ thuật Cao Thắng";
  const shippingFee = Number(quote?.shipping_fee ?? 0);
  const pointsDiscount = Number(quote?.points_discount ?? appliedPoints * pointVndRate);
  const finalTotal = Math.max(
    0,
    Number(quote?.total ?? itemsSubtotal + shippingFee - pointsDiscount)
  );

  const handleTogglePoints = (checked) => {
    setUseRewardPoints(checked);
    setPointsInput(checked ? String(maxRedeemablePoints) : "");
  };

  const handleChangePointsInput = (rawValue) => {
    if (rawValue === "") {
      setPointsInput("");
      return;
    }
    const numeric = Math.max(0, Math.floor(Number(rawValue) || 0));
    setPointsInput(String(Math.min(numeric, maxRedeemablePoints)));
  };

  const handlePlaceOrder = async () => {
    if (submitting || normalizedItems.length === 0) return;
    if (!selectedAddressId) {
      setSubmitError("Vui lòng chọn hoặc thêm địa chỉ giao hàng.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const addressSnapshot = selectedAddress
      ? {
          recipient_name: selectedAddress.recipient_name,
          phone: selectedAddress.phone,
          address: selectedAddress.address,
        }
      : null;
    const itemsSnapshot = normalizedItems.map((item) => ({
      productId: item.productId,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));

    try {
      const res = await customerApi.createRetailOrder({
        address_id: Number(selectedAddressId),
        payment_method: paymentMethod,
        points_to_use: appliedPoints,
        note: note.trim() || null,
        idempotency_key: idempotencyKeyRef.current,
      });
      let data = res?.data?.data ?? res?.data ?? {};
      const createdOrderId = data.order_id ?? data.id;

      // Nếu API tạo đơn chưa trả kèm mã QR ApiPay thì gọi tiếp bước khởi tạo thanh toán
      if (paymentMethod === "ApiPay" && createdOrderId && !data.pay_url && !data.qr_url) {
        const payRes = await customerApi.checkout({ order_id: Number(createdOrderId) });
        const payData = payRes?.data?.data ?? payRes?.data ?? {};
        data = { ...data, ...payData };
      }

      await refreshCart?.();
      idempotencyKeyRef.current = createIdempotencyKey();

      if (paymentMethod === "COD" || (!data.pay_url && !data.qr_url)) {
        savePendingOrder(null);
        showGlobalToast("Đặt hàng thành công! Đơn hàng đang được chuẩn bị.", "success");
        navigate("/orders");
        return;
      }

      const pendingOrderSnapshot = {
        ...data,
        order_id: createdOrderId,
        subtotal: Number(data.subtotal ?? itemsSubtotal),
        shipping_fee: Number(data.shipping_fee ?? shippingFee),
        points_discount: Number(data.points_discount ?? pointsDiscount),
        total: Number(data.total ?? finalTotal),
        address: data.address ?? addressSnapshot,
        items: Array.isArray(data.items) && data.items.length > 0 ? data.items : itemsSnapshot,
        _created_at_ms: Date.now(),
      };

      savePendingOrder(pendingOrderSnapshot);
      setCreatedOrder(pendingOrderSnapshot);
      showGlobalToast("Đã tạo đơn hàng. Vui lòng hoàn tất thanh toán ApiPay.", "info");
    } catch (err) {
      if (err?.status === 409) idempotencyKeyRef.current = createIdempotencyKey();
      setSubmitError(apiErrorMessage(err, "Không thể tạo đơn hàng. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOrderPaymentStatus = useCallback(
    async (silent = false) => {
      const orderId = createdOrder?.order_id ?? createdOrder?.id;
      if (!orderId) return;

      if (!silent) setCheckingPayment(true);
      try {
        const res = await customerApi.getRetailOrderStatus(orderId);
        const statusData = res?.data?.data ?? res?.data ?? {};
        const isPaid =
          statusData.payment_status === "Thanh_cong" ||
          ["Cho_xac_nhan", "Da_xac_nhan", "Dang_giao", "Hoan_thanh"].includes(statusData.status);

        if (isPaid) {
          savePendingOrder(null);
          setCreatedOrder(null);
          showGlobalToast("Thanh toán thành công! Đơn hàng đã được xác nhận.", "success");
          navigate("/orders");
        } else if (statusData.status === "Da_huy") {
          savePendingOrder(null);
          setCreatedOrder(null);
          if (!silent) {
            showGlobalToast("Đơn hàng đã bị hủy hoặc hết hạn thanh toán.", "warning");
          }
          navigate("/orders");
        } else if (!silent) {
          showGlobalToast(
            "Hệ thống chưa nhận được giao dịch thanh toán. Vui lòng thử lại sau ít giây.",
            "info"
          );
        }
      } catch (err) {
        if (!silent) {
          showGlobalToast(apiErrorMessage(err, "Không thể kiểm tra trạng thái thanh toán."), "error");
        }
      } finally {
        if (!silent) setCheckingPayment(false);
      }
    },
    [createdOrder, navigate]
  );

  // Tự động kiểm tra trạng thái thanh toán mỗi 5 giây khi đang hiện mã QR
  useEffect(() => {
    const orderId = createdOrder?.order_id ?? createdOrder?.id;
    if (!orderId) return undefined;

    const interval = window.setInterval(() => {
      verifyOrderPaymentStatus(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [createdOrder, verifyOrderPaymentStatus]);

  return (
    <div className="bg-[#f6f8f6] min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-5rem)] flex flex-col lg:overflow-hidden">
      {/* 1. Thanh tiêu đề cố định & thu gọn chiều cao */}
      <header className="sticky top-20 lg:static shrink-0 bg-white/95 backdrop-blur-md border-b border-[#c0c9bb]/45 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#00450d] text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-[#91f78e]" />
            </div>
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h1
                className="text-base sm:text-xl font-extrabold text-[#00450d] tracking-tight truncate"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                Xác Nhận & Thanh Toán
              </h1>
              <span className="hidden md:inline text-xs text-[#5a6357] truncate">
                Giao hỏa tốc bằng thùng giữ lạnh chuyên dụng · Nông sản tươi sạch thu hoạch trong ngày
              </span>
            </div>
          </div>

          <Link
            to="/cart"
            onClick={() => {
              savePendingOrder(null);
              setCreatedOrder(null);
            }}
            className="h-8.5 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#f2f4f2] text-[#191c1b] border border-[#c0c9bb]/70 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#006e1c]" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>
      </header>

      {/* 2. Khu vực nội dung 2 cột */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto lg:overflow-hidden">
        {createdOrder ? (
          <div className="h-full lg:overflow-y-auto pb-6">
            <CheckoutPendingPayment
              order={createdOrder}
              checkingPayment={checkingPayment}
              onCheckStatus={() => verifyOrderPaymentStatus(false)}
            />
          </div>
        ) : bootLoading || cartLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 h-64 rounded-3xl bg-white border border-[#c0c9bb]/40 animate-pulse" />
            <div className="lg:col-span-6 h-96 rounded-3xl bg-white border border-[#c0c9bb]/40 animate-pulse" />
          </div>
        ) : normalizedItems.length === 0 ? (
          <div className="max-w-lg mx-auto rounded-3xl bg-white border border-[#c0c9bb]/50 p-10 text-center space-y-4">
            <ShoppingBag className="w-10 h-10 text-[#006e1c] mx-auto" />
            <h2 className="text-lg font-extrabold text-[#191c1b]">
              Không có sản phẩm nào để thanh toán
            </h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00450d] text-white text-xs font-bold"
            >
              Quay lại cửa hàng nông sản
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 h-full min-h-0 items-start">
            {/* Cột trái: Danh sách nông sản đứng yên, chỉ cuộn khi vượt màn hình */}
            <CheckoutItemList items={normalizedItems} itemsSubtotal={itemsSubtotal} />

            {/* Cột phải: Cuộn độc lập */}
            <div className="lg:col-span-6 lg:h-full lg:overflow-y-auto lg:pr-1 space-y-4 pb-6">
              {submitError && (
                <div
                  role="alert"
                  className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2 text-xs sm:text-sm text-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <CheckoutDeliveryAndPayment
                addresses={addresses}
                selectedAddressId={selectedAddressId}
                onSelectAddress={(nextId) => setSelectedAddressId(String(nextId))}
                onAddressCreated={(created) => {
                  if (!created?.id) return;
                  setAddresses((prev) => [
                    created,
                    ...prev.filter((item) => String(item.id) !== String(created.id)),
                  ]);
                  setSelectedAddressId(String(created.id));
                }}
                originName={originName}
                distanceKm={distanceKm}
                pricePerKm={pricePerKm}
                quote={quote}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                paymentMethod={paymentMethod}
                onChangePaymentMethod={setPaymentMethod}
                note={note}
                onChangeNote={setNote}
              />

              <CheckoutSummaryCard
                itemsCount={normalizedItems.length}
                itemsSubtotal={itemsSubtotal}
                originName={originName}
                distanceKm={distanceKm}
                pricePerKm={pricePerKm}
                shippingFee={shippingFee}
                pointsDiscount={pointsDiscount}
                finalTotal={finalTotal}
                availablePoints={availablePoints}
                pointVndRate={pointVndRate}
                maxRedeemablePoints={maxRedeemablePoints}
                useRewardPoints={useRewardPoints}
                pointsInput={pointsInput}
                onTogglePoints={handleTogglePoints}
                onChangePointsInput={handleChangePointsInput}
                paymentMethod={paymentMethod}
                apiPayReady={apiPayReady}
                selectedAddressId={selectedAddressId}
                quoteLoading={quoteLoading}
                submitting={submitting}
                onPlaceOrder={handlePlaceOrder}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}