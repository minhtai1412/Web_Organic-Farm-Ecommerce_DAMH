/* ==========================================================================
 * TRANG ĐĂNG KÝ GÓI RAU CỦ ĐỊNH KỲ (SUBSCRIPTION REGISTER PAGE)
 * ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { storefrontApi } from "../../services/storefrontApi";
import SubscriptionPendingPayment from "../../components/customer/SubscriptionPendingPayment";
import SubscriptionScheduleForm from "../../components/customer/SubscriptionScheduleForm";
import { confirmGlobalDialog, showGlobalToast } from "../../components/GlobalToast";

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createIdempotencyKey() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function apiErrorMessage(error) {
  const validationMessages = Object.values(
    error?.fieldErrors ?? error?.response?.data?.errors ?? {}
  ).flat();
  return (
    validationMessages[0] ||
    error?.message ||
    error?.response?.data?.message ||
    "Không thể xử lý đăng ký. Vui lòng thử lại."
  );
}

function readJsonStorage(key) {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  if (!key) return;
  try {
    if (value == null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }
}

export default function SubscriptionRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminPreview = user?.role === "admin";
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedProduct = location.state?.product;

  const subscriptionStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscription:${user.id}` : null;
  const paymentStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscriptionPayment:${user.id}` : null;
  const summaryStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscriptionSummary:${user.id}` : null;
  const idempotencyStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscriptionIdempotency:${user.id}` : null;

  const [packages, setPackages] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState("new");
  const [packageId, setPackageId] = useState(searchParams.get("package_id") ?? "");
  const [addressId, setAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    recipient_name: "",
    phone: "",
    street: "",
    ward: "",
    province: "TP. Hồ Chí Minh",
  });
  const [startDate, setStartDate] = useState(() => localDateString());
  const [minStartDate] = useState(() => localDateString());
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [apiPayReady, setApiPayReady] = useState(false);

  const [subscriptionId, setSubscriptionId] = useState(() =>
    subscriptionStorageKey ? window.localStorage.getItem(subscriptionStorageKey) ?? "" : ""
  );
  const [payment, setPayment] = useState(() => readJsonStorage(paymentStorageKey));
  const [pendingSummary, setPendingSummary] = useState(() => readJsonStorage(summaryStorageKey));
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const clearPendingSubscriptionStorage = useCallback(() => {
    if (subscriptionStorageKey) window.localStorage.removeItem(subscriptionStorageKey);
    if (paymentStorageKey) window.localStorage.removeItem(paymentStorageKey);
    if (summaryStorageKey) window.localStorage.removeItem(summaryStorageKey);
    if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
  }, [subscriptionStorageKey, paymentStorageKey, summaryStorageKey, idempotencyStorageKey]);

  useEffect(() => {
    let active = true;

    const loadData = isAdminPreview
      ? Promise.all([
        storefrontApi.getSubscriptions(),
        Promise.resolve({ data: { data: [] } }),
        Promise.resolve({ data: { ready: false } }),
      ])
      : Promise.all([
        storefrontApi.getSubscriptions(),
        customerApi.getAddresses(),
        customerApi.getCheckoutOptions(),
      ]);

    loadData
      .then(([availablePackages, addressResponse, optionsResponse]) => {
        if (!active) return;
        const addressList = addressResponse.data?.data ?? addressResponse.data ?? [];
        setPackages(availablePackages);
        setAddresses(addressList);
        setAddressMode(addressList.length > 0 ? "saved" : "new");
        setAddressId(
          String(
            addressList.find((address) => address.is_default)?.id ?? addressList[0]?.id ?? ""
          )
        );
        setApiPayReady(!isAdminPreview && Boolean(optionsResponse.data?.ready));

        const productPackage = selectedProduct
          ? availablePackages.find((item) =>
            item.items?.some(
              (packageItem) => String(packageItem.product_id) === String(selectedProduct.id)
            )
          )
          : null;
        setPackageId(
          (current) =>
            current ||
            String(
              productPackage?.id ??
              searchParams.get("package_id") ??
              availablePackages[0]?.id ??
              ""
            )
        );
      })
      .catch((error) => {
        if (active) setErrorMessage(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams, selectedProduct, isAdminPreview]);

  // Hàm kiểm tra trạng thái đăng ký gói (dùng cho cả polling tự động 5s và nút bấm thủ công)
  const verifySubscriptionPaymentStatus = useCallback(
    async (silent = false) => {
      if (!subscriptionId || isAdminPreview) return;

      if (!silent) {
        setErrorMessage("");
        setCheckingStatus(true);
      }

      try {
        const response = await customerApi.getSubscriptionStatus(subscriptionId);
        const status = response.data?.data ?? response.data ?? {};
        setSubscriptionStatus(status);

        if (status?.status === "Dang_hoat_dong") {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setPendingSummary(null);
          setSubscriptionStatus(null);
          showGlobalToast(
            "Thanh toán thành công! Gói rau định kỳ của bạn đã được kích hoạt.",
            "success"
          );
          navigate("/rewards?tab=orders&sub=subscriptions");
        } else if (status?.status === "Da_huy" || status?.status === "Het_han") {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setPendingSummary(null);
          setSubscriptionStatus(null);
          if (!silent) {
            showGlobalToast("Đăng ký gói định kỳ đã bị hủy hoặc hết hạn.", "warning");
          }
        } else if (!silent) {
          showGlobalToast(
            "Hệ thống chưa nhận được giao dịch thanh toán. Vui lòng thử lại sau ít giây.",
            "info"
          );
        }
      } catch (error) {
        if (error?.status === 404) {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setPendingSummary(null);
          setSubscriptionStatus(null);
        } else if (!silent) {
          setErrorMessage(apiErrorMessage(error));
        }
      } finally {
        if (!silent) setCheckingStatus(false);
      }
    },
    [subscriptionId, isAdminPreview, clearPendingSubscriptionStorage, navigate]
  );

  // Kiểm tra ngay khi có subscriptionId và tự động polling mỗi 5 giây
  useEffect(() => {
    if (!subscriptionId || isAdminPreview) return undefined;

    verifySubscriptionPaymentStatus(true);
    const interval = window.setInterval(() => {
      verifySubscriptionPaymentStatus(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [subscriptionId, isAdminPreview, verifySubscriptionPaymentStatus]);

  const startPayment = async (id) => {
    if (isAdminPreview) {
      showGlobalToast("Tài khoản Quản trị viên chỉ được xem trước, không thể thanh toán.", "warning");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await customerApi.checkoutSubscription(id);
      const paymentData = response.data?.data ?? response.data ?? null;
      setPayment(paymentData);
      writeJsonStorage(paymentStorageKey, paymentData);
      setNotice("Đăng ký đã được lưu. Hoàn tất thanh toán để kích hoạt gói.");
    } catch (error) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (isAdminPreview || !subscriptionId || isCancelling) return;

    const confirmed = await confirmGlobalDialog({
      title: "Hủy đăng ký gói định kỳ?",
      message: `Bạn có chắc chắn muốn hủy đăng ký #${subscriptionId} đang chờ thanh toán không?`,
      confirmLabel: "Xác nhận hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setErrorMessage("");
    setIsCancelling(true);
    try {
      await customerApi.cancelSubscription(subscriptionId);
      clearPendingSubscriptionStorage();
      setSubscriptionId("");
      setPayment(null);
      setPendingSummary(null);
      setSubscriptionStatus(null);
      showGlobalToast("Đã hủy đăng ký gói định kỳ.", "info");
      setNotice("Đã hủy đăng ký gói định kỳ. Bạn có thể chọn gói mới bất kỳ lúc nào.");
    } catch (error) {
      if (error?.status === 404) {
        clearPendingSubscriptionStorage();
        setSubscriptionId("");
        setPayment(null);
        setPendingSummary(null);
        setSubscriptionStatus(null);
      } else {
        setErrorMessage(apiErrorMessage(error));
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isAdminPreview) {
      showGlobalToast("Chế độ xem trước Admin: không cho phép đăng ký và thanh toán.", "warning");
      return;
    }

    setErrorMessage("");
    setNotice("");
    setIsSubmitting(true);

    // Tạo bản chụp gói, địa chỉ & lịch giao để hiển thị bên cột phải màn hình QR
    const chosenPackage = packages.find((item) => String(item.id) === String(packageId)) || null;
    const savedAddressObj =
      addressMode === "saved"
        ? addresses.find((item) => String(item.id) === String(addressId)) || null
        : null;
    const addressSnapshot = savedAddressObj
      ? {
        recipient_name: savedAddressObj.recipient_name,
        phone: savedAddressObj.phone,
        address: savedAddressObj.address,
      }
      : {
        recipient_name: shippingAddress.recipient_name,
        phone: shippingAddress.phone,
        address: [shippingAddress.street, shippingAddress.ward, shippingAddress.province]
          .filter(Boolean)
          .join(", "),
      };

    const summarySnapshot = {
      package: chosenPackage,
      address: addressSnapshot,
      startDate,
      deliveryDays,
      _created_at_ms: Date.now(),
    };

    try {
      let id = subscriptionId;
      if (!id) {
        let idempotencyKey = idempotencyStorageKey
          ? window.localStorage.getItem(idempotencyStorageKey)
          : null;
        if (!idempotencyKey) {
          idempotencyKey = createIdempotencyKey();
          if (idempotencyStorageKey) {
            window.localStorage.setItem(idempotencyStorageKey, idempotencyKey);
          }
        }

        const registration = await customerApi.createSubscription({
          package_id: Number(packageId),
          ...(addressMode === "saved"
            ? { address_id: Number(addressId) }
            : { shipping_address: shippingAddress }),
          start_date: startDate,
          delivery_days: deliveryDays,
          idempotency_key: idempotencyKey,
        });
        const regData = registration.data?.data ?? registration.data ?? {};
        id = String(regData.subscription_id ?? "");
        if (!id) throw new Error("Máy chủ chưa trả về mã đăng ký.");
        if (subscriptionStorageKey) window.localStorage.setItem(subscriptionStorageKey, id);
        if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
        setSubscriptionId(id);
      }

      const checkout = await customerApi.checkoutSubscription(id);
      const paymentData = checkout.data?.data ?? checkout.data ?? null;
      setPayment(paymentData);
      setPendingSummary(summarySnapshot);
      writeJsonStorage(paymentStorageKey, paymentData);
      writeJsonStorage(summaryStorageKey, summarySnapshot);
      showGlobalToast("Đã tạo đăng ký gói. Vui lòng hoàn tất thanh toán ApiPay.", "info");
    } catch (error) {
      if (error?.status === 409 && idempotencyStorageKey) {
        window.localStorage.removeItem(idempotencyStorageKey);
      }
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (weekday) => {
    setDeliveryDays((current) => {
      const existing = current.some((item) => item.weekday === weekday);
      return existing
        ? current.filter((item) => item.weekday !== weekday)
        : [...current, { weekday, delivery_window: "08:00 - 10:00" }].sort(
          (left, right) => left.weekday - right.weekday
        );
    });
  };

  const changeWindow = (weekday, deliveryWindow) => {
    setDeliveryDays((current) =>
      current.map((item) =>
        item.weekday === weekday ? { ...item, delivery_window: deliveryWindow } : item
      )
    );
  };

  const handleShippingAddressChange = (field, value) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  const currentStep =
    !isAdminPreview && subscriptionId ? 3 : packageId && deliveryDays.length > 0 ? 2 : 1;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-200/70 animate-pulse" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-72 rounded-3xl bg-white border border-slate-200/70 animate-pulse" />
          <div className="h-72 rounded-3xl bg-white border border-slate-200/70 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ================= BANNER CHẾ ĐỘ XEM TRƯỚC DÀNH CHO ADMIN ================= */}
      {isAdminPreview && (
        <div
          role="region"
          aria-label="Chế độ xem trước của Quản trị viên"
          className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-amber-950 shadow-2xs"
        >
          <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm">
            <Eye className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <p className="font-semibold">
              Bạn đang xem giao diện gói rau định kỳ ở trang khách hàng dưới quyền{" "}
              <strong className="font-extrabold">Quản trị viên (Admin)</strong>. Thao tác đăng ký
              và thanh toán ApiPay được khóa.
            </p>
          </div>
          <Link
            to="/admin/catalog?tab=subscriptions"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] px-3.5 py-2 text-xs font-extrabold text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại quản lý gói</span>
          </Link>
        </div>
      )}

      {/* ================= HERO BANNER & THANH 3 BƯỚC THU GỌN ================= */}
      <header className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#00450d] via-[#065214] to-[#006e1c] text-white shadow-xs border border-[#0b5e1a]">
        <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Cột trái: Tiêu đề + mô tả ngắn gọn */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                Đăng ký gói rau định kỳ
              </h1>
            </div>

            <p className="text-xs sm:text-[13px] text-emerald-100/90 leading-snug">
              Thu hoạch sáng sớm theo lô FEFO · Giao cố định hằng tuần · Tạm hoãn linh hoạt trước 12h.
            </p>
          </div>

          {/* Cột phải: Thanh tiến trình 3 bước nằm ngang gọn gàng */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {[
              { step: 1, title: "Chọn gói" },
              { step: 2, title: "Lịch & địa chỉ" },
              { step: 3, title: "Thanh toán QR" },
            ].map((item, idx) => {
              const isDone = currentStep > item.step;
              const isCurrent = currentStep === item.step;
              return (
                <div key={item.step} className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors ${isCurrent
                        ? "bg-white text-[#00450d] border-white font-extrabold shadow-2xs"
                        : isDone
                          ? "bg-emerald-500/25 text-white border-emerald-300/35 font-semibold"
                          : "bg-white/10 text-emerald-100/80 border-white/15 font-medium"
                      }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${isCurrent
                          ? "bg-[#00450d] text-white"
                          : isDone
                            ? "bg-[#91f78e] text-[#00450d]"
                            : "bg-white/20 text-white"
                        }`}
                    >
                      {isDone ? "✓" : item.step}
                    </span>
                    <span className="whitespace-nowrap">{item.title}</span>
                  </div>
                  {idx < 2 && (
                    <span className="hidden sm:inline text-emerald-200/50 text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ================= THÔNG BÁO LỖI / TRẠNG THÁI ================= */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-2xs"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-2xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{notice}</p>
        </div>
      )}

      {/* ================= NỘI DUNG CHÍNH ================= */}
      {!isAdminPreview && subscriptionId ? (
        <SubscriptionPendingPayment
          subscriptionId={subscriptionId}
          payment={payment}
          subscriptionStatus={subscriptionStatus}
          summary={pendingSummary}
          apiPayReady={apiPayReady}
          isSubmitting={isSubmitting}
          isCancelling={isCancelling}
          checkingStatus={checkingStatus}
          onRetryPayment={() => startPayment(subscriptionId)}
          onCheckStatus={() => verifySubscriptionPaymentStatus(false)}
          onCancel={handleCancelSubscription}
        />
      ) : packages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          Hiện chưa có gói rau định kỳ đang mở bán.
        </div>
      ) : (
        <SubscriptionScheduleForm
          packages={packages}
          addresses={addresses}
          addressMode={addressMode}
          onAddressModeChange={setAddressMode}
          packageId={packageId}
          onPackageChange={setPackageId}
          addressId={addressId}
          onAddressChange={setAddressId}
          shippingAddress={shippingAddress}
          onShippingAddressChange={handleShippingAddressChange}
          startDate={startDate}
          minStartDate={minStartDate}
          onStartDateChange={setStartDate}
          deliveryDays={deliveryDays}
          onToggleDay={toggleDay}
          onWindowChange={changeWindow}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          apiPayReady={apiPayReady}
          isPreviewOnly={isAdminPreview}
        />
      )}
    </main>
  );
}