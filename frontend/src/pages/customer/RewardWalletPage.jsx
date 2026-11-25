/* ==========================================================================
 * TRANG TRUNG TÂM KHÁCH HÀNG (CUSTOMER ACCOUNT CENTER THEO CHUẨN SHOPEE)
 * Bao gồm:
 * 1. Hồ sơ của tôi (Thông tin cá nhân: Họ tên, Số điện thoại, Email)
 * 2. Sổ địa chỉ giao hàng (Danh sách thẻ địa chỉ, thiết lập mặc định, thêm/sửa/xóa)
 * 3. Đổi mật khẩu tài khoản (Bảo mật 3 lớp xác thực)
 * 4. Ví điểm thưởng & Lịch sử xu/điểm (Số dư, quy đổi, bộ lọc lịch sử)
 * 5. Đơn mua của tôi (Tất cả đơn hàng, Gói định kỳ, Khiếu nại)
 * ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapPin,
  Lock,
  User,
  Package,
  Coins,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import ProfileInfoTab from "../../components/customer/profile/ProfileInfoTab";
import AddressBookTab from "../../components/customer/profile/AddressBookTab";
import RewardHistoryTab from "../../components/customer/profile/RewardHistoryTab";
import OrdersHistoryTab from "../../components/customer/profile/OrdersHistoryTab";

export default function RewardWalletPage() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Xác định tab hiện tại từ query param: profile | address | password | rewards | orders
  const tabParam = searchParams.get("tab");
  const subTabParam = searchParams.get("sub");

  const getNormalizedTab = (param) => {
    if (param === "address") return "address";
    if (param === "password") return "password";
    if (param === "rewards") return "rewards";
    if (param === "orders") return "orders";
    return "profile";
  };

  const [activeTab, setActiveTab] = useState(() => getNormalizedTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(getNormalizedTab(tabParam));
    }
  }, [tabParam]);

  const switchTab = (tabName, subTab = null) => {
    setActiveTab(tabName);
    setSearchParams(
      subTab ? { tab: tabName, sub: subTab } : { tab: tabName },
      { replace: true }
    );
  };

  /* ==========================================================================
   * 1. NGHIỆP VỤ HỒ SƠ CÁ NHÂN (SHOPEE PROFILE: SỐ ĐIỆN THOẠI & EMAIL)
   * ========================================================================== */
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Quản lý ảnh đại diện (Avatar)
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(() => {
    return user?.avatar || (user?.id ? localStorage.getItem(`user_avatar_${user.id}`) : null);
  });

  useEffect(() => {
    if (user) {
      const savedAvatar =
        user.avatar || (user.id ? localStorage.getItem(`user_avatar_${user.id}`) : null);
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showGlobalToast("Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp).", "warning");
      return;
    }

    if (file.size > 1024 * 1024) {
      showGlobalToast("Dung lượng ảnh tối đa là 1MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setAvatar(base64);
        if (setUser) {
          const updated = { ...user, avatar: base64 };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
          if (user?.id) {
            localStorage.setItem(`user_avatar_${user.id}`, base64);
          }
        }
        showGlobalToast("Cập nhật ảnh đại diện thành công.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (setUser) {
      const updated = { ...user, avatar: null };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      if (user?.id) {
        localStorage.removeItem(`user_avatar_${user.id}`);
      }
    }
    showGlobalToast("Đã gỡ ảnh đại diện.", "success");
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileSubmitting) return;

    if (!profileForm.name.trim()) {
      showGlobalToast("Vui lòng nhập họ và tên.", "warning");
      return;
    }
    if (!profileForm.phone.trim()) {
      showGlobalToast("Vui lòng nhập số điện thoại.", "warning");
      return;
    }
    if (!profileForm.email.trim()) {
      showGlobalToast("Vui lòng nhập địa chỉ email.", "warning");
      return;
    }

    setProfileSubmitting(true);
    try {
      const response = await customerApi.updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
      });
      const updatedUserData = response.data?.user;
      if (updatedUserData && setUser) {
        const mergedUser = {
          ...user,
          ...updatedUserData,
          permissions: user?.permissions || [],
        };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      }
      showGlobalToast("Cập nhật thông tin hồ sơ thành công.", "success");
    } catch (err) {
      showGlobalToast(err?.message || "Không thể cập nhật hồ sơ cá nhân.", "error");
    } finally {
      setProfileSubmitting(false);
    }
  };

  /* ==========================================================================
   * 2. NGHIỆP VỤ SỔ ĐỊA CHỈ NHẬN HÀNG (SHOPEE ADDRESS BOOK)
   * ========================================================================== */
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    recipient_name: "",
    phone: "",
    detail_address: "",
    ward: "",
    province: "TP. Hồ Chí Minh",
    is_default: false,
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setAddressLoading(true);
    try {
      const response = await customerApi.getAddresses();
      setAddresses(response.data || []);
    } catch {
      showGlobalToast("Không thể tải danh sách địa chỉ giao hàng.", "error");
    } finally {
      setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "address") {
      fetchAddresses();
    }
  }, [activeTab, fetchAddresses]);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setAddressForm({
      recipient_name: user?.name || "",
      phone: user?.phone || "",
      detail_address: "",
      ward: "",
      province: "TP. Hồ Chí Minh",
      is_default: addresses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      recipient_name: addr.recipient_name || "",
      phone: addr.phone || "",
      detail_address: addr.detail_address || "",
      ward: addr.ward || "",
      province: addr.province || "TP. Hồ Chí Minh",
      is_default: Boolean(addr.is_default),
    });
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (addressSubmitting) return;

    if (!addressForm.recipient_name.trim()) {
      showGlobalToast("Vui lòng nhập họ và tên người nhận.", "warning");
      return;
    }
    if (!addressForm.phone.trim()) {
      showGlobalToast("Vui lòng nhập số điện thoại người nhận.", "warning");
      return;
    }
    if (!addressForm.detail_address.trim()) {
      showGlobalToast("Vui lòng nhập số nhà, tên đường cụ thể.", "warning");
      return;
    }
    if (!addressForm.ward.trim() || !addressForm.province.trim()) {
      showGlobalToast("Vui lòng nhập đầy đủ phường/xã và tỉnh/thành phố.", "warning");
      return;
    }

    setAddressSubmitting(true);
    try {
      if (editingAddress) {
        await customerApi.updateAddress(editingAddress.id, addressForm);
        showGlobalToast("Cập nhật địa chỉ nhận hàng thành công.", "success");
      } else {
        await customerApi.createAddress(addressForm);
        showGlobalToast("Thêm địa chỉ nhận hàng mới thành công.", "success");
      }
      setIsModalOpen(false);
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể lưu địa chỉ giao hàng.", "error");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      await customerApi.setDefaultAddress(addrId);
      showGlobalToast("Đã thiết lập làm địa chỉ mặc định.", "success");
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể đặt địa chỉ mặc định.", "error");
    }
  };

  const handleDeleteAddress = async (addrId) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa địa chỉ",
      message: "Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này không?",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await customerApi.deleteAddress(addrId);
      showGlobalToast("Đã xóa địa chỉ thành công.", "success");
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể xóa địa chỉ.", "error");
    }
  };

  /* ==========================================================================
   * 3. NGHIỆP VỤ ĐỔI MẬT KHẨU (SHOPEE PASSWORD)
   * ========================================================================== */
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordSubmitting) return;

    if (!passwordForm.current_password) {
      showGlobalToast("Vui lòng nhập mật khẩu hiện tại.", "warning");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showGlobalToast("Mật khẩu mới phải có tối thiểu 8 ký tự.", "warning");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      showGlobalToast("Xác nhận mật khẩu mới không trùng khớp.", "warning");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await customerApi.changePassword(passwordForm);
      showGlobalToast("Đổi mật khẩu tài khoản thành công.", "success");
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (err) {
      showGlobalToast(
        err?.message || "Mật khẩu hiện tại không chính xác. Vui lòng thử lại.",
        "error"
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  /* ==========================================================================
   * 4. NGHIỆP VỤ VÍ ĐIỂM THƯỞNG (SHOPEE XU / REWARD POINTS)
   * ========================================================================== */
  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletHistoryMeta, setWalletHistoryMeta] = useState(null);
  const [walletHistoryLoadingMore, setWalletHistoryLoadingMore] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all"); // all | earned | spent

  const fetchWallet = useCallback(async (page = 1, append = false) => {
    if (page === 1) setWalletLoading(true);
    try {
      const response = await customerApi.getRewardPoints({ page, per_page: 50 });
      setWalletData((current) => ({
        ...response.data,
        history: append
          ? [...(current?.history || []), ...(response.data?.history || [])]
          : response.data?.history || [],
      }));
      setWalletHistoryMeta(response.meta?.history || null);
    } catch {
      showGlobalToast("Không thể tải thông tin ví điểm thưởng.", "error");
    } finally {
      if (page === 1) setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "rewards") {
      fetchWallet();
    }
  }, [activeTab, fetchWallet]);

  const filteredHistory = (walletData?.history || []).filter((item) => {
    if (historyFilter === "earned")
      return item.transaction_type === "Tich_diem" || item.transaction_type === "Hoan_diem";
    if (historyFilter === "spent") return item.transaction_type === "Su_dung";
    return true;
  });

  const loadMoreWalletHistory = async () => {
    if (!walletHistoryMeta || walletHistoryMeta.current_page >= walletHistoryMeta.last_page) return;
    setWalletHistoryLoadingMore(true);
    try {
      await fetchWallet(walletHistoryMeta.current_page + 1, true);
    } finally {
      setWalletHistoryLoadingMore(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] md:overflow-hidden bg-[#f5f5f5] py-6 sm:py-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full">
        {/* ================= KHUNG BỐ CỤC CHÍNH (CỘT TRÁI CỐ ĐỊNH + CỘT PHẢI CUỘN RIÊNG) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full items-start">
          {/* ================= CỘT TRÁI: SIDEBAR TÀI KHOẢN (CỐ ĐỊNH) ================= */}
          <aside className="md:col-span-3 space-y-4 md:sticky md:top-0">
            {/* Thẻ đại diện người dùng */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5e7eb] flex items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#00450d] text-white flex items-center justify-center font-extrabold text-lg shrink-0 overflow-hidden border border-slate-200">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user?.name || user?.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div
                onClick={() => switchTab("profile")}
                className="truncate cursor-pointer group"
                title="Xem hồ sơ cá nhân"
              >
                <p className="text-sm font-bold text-[#191c1b] group-hover:text-[#00450d] truncate leading-tight transition-colors">
                  {user?.name || "Khách hàng"}
                </p>
                <p className="text-xs text-[#5a6357] truncate mt-0.5">
                  {user?.phone || "Chưa có số điện thoại"}
                </p>
                <p className="text-[11px] text-[#5a6357] truncate font-mono">
                  {user?.email || "—"}
                </p>
              </div>
            </div>

            {/* Menu điều hướng chức năng tài khoản */}
            <nav className="bg-white rounded-2xl border border-[#e5e7eb] p-2 shadow-2xs space-y-1">
              <button
                type="button"
                onClick={() => switchTab("profile")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "profile"
                    ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                    : "text-[#41493e] hover:bg-[#f3f4f6]"
                }`}
              >
                <User className="w-4 h-4 text-[#00450d]" />
                <span>Hồ sơ của tôi</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("address")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "address"
                    ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                    : "text-[#41493e] hover:bg-[#f3f4f6]"
                }`}
              >
                <MapPin className="w-4 h-4 text-[#00450d]" />
                <span>Địa chỉ nhận hàng</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("password")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "password"
                    ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                    : "text-[#41493e] hover:bg-[#f3f4f6]"
                }`}
              >
                <Lock className="w-4 h-4 text-[#00450d]" />
                <span>Đổi mật khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("rewards")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "rewards"
                    ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                    : "text-[#41493e] hover:bg-[#f3f4f6]"
                }`}
              >
                <Coins className="w-4 h-4 text-[#00450d]" />
                <span>Ví điểm thưởng</span>
              </button>

              <div className="pt-2 my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => switchTab("orders", "orders")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeTab === "orders"
                    ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                    : "text-[#41493e] hover:bg-[#f3f4f6]"
                }`}
              >
                <Package className="w-4 h-4 text-[#00450d]" />
                <span>Đơn mua của tôi</span>
              </button>
            </nav>
          </aside>

          {/* ================= CỘT PHẢI: KHUNG NỘI DUNG CHÍNH (CUỘN ĐỘC LẬP) ================= */}
          <main className="md:col-span-9 bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 shadow-xs md:h-full md:overflow-y-auto">
            <ProfileInfoTab
              activeTab={activeTab}
              user={user}
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              profileSubmitting={profileSubmitting}
              handleUpdateProfile={handleUpdateProfile}
              avatar={avatar}
              fileInputRef={fileInputRef}
              handleAvatarChange={handleAvatarChange}
              handleRemoveAvatar={handleRemoveAvatar}
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              showCurrentPass={showCurrentPass}
              setShowCurrentPass={setShowCurrentPass}
              showNewPass={showNewPass}
              setShowNewPass={setShowNewPass}
              passwordSubmitting={passwordSubmitting}
              handleChangePassword={handleChangePassword}
            />
            {activeTab === "address" && (
              <AddressBookTab
                addresses={addresses}
                addressLoading={addressLoading}
                handleOpenAddModal={handleOpenAddModal}
                handleOpenEditModal={handleOpenEditModal}
                handleDeleteAddress={handleDeleteAddress}
                handleSetDefault={handleSetDefault}
              />
            )}
            {activeTab === "rewards" && (
              <RewardHistoryTab
                walletLoading={walletLoading}
                walletData={walletData}
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                filteredHistory={filteredHistory}
                walletHistoryMeta={walletHistoryMeta}
                loadMoreWalletHistory={loadMoreWalletHistory}
                walletHistoryLoadingMore={walletHistoryLoadingMore}
              />
            )}
            {activeTab === "orders" && (
              <OrdersHistoryTab
                initialSubTab={subTabParam || "orders"}
                onSubTabChange={(nextSub) => switchTab("orders", nextSub)}
              />
            )}
          </main>
        </div>
      </div>

      {/* ================= MODAL THÊM / SỬA ĐỊA CHỈ (SHOPEE STYLE) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e5e7eb] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#191c1b] mb-4 pb-2 border-b border-slate-100">
              {editingAddress ? "Cập Nhật Địa Chỉ" : "Địa Chỉ Mới"}
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.recipient_name}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, recipient_name: e.target.value })
                    }
                    placeholder="Họ và tên người nhận"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, phone: e.target.value })
                    }
                    placeholder="Số điện thoại người nhận"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Tỉnh / Thành phố *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.province}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, province: e.target.value })
                    }
                    placeholder="TP. Hồ Chí Minh"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Phường / Xã mới *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.ward}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, ward: e.target.value })
                    }
                    placeholder="Phường Bến Nghé"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                  Địa chỉ cụ thể *
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.detail_address}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, detail_address: e.target.value })
                  }
                  placeholder="Số nhà, tên tòa nhà, tên đường"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Dùng phường/xã hiện hành và tỉnh/thành phố; không nhập quận/huyện.
              </p>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, is_default: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00450d] focus:ring-[#00450d]"
                  />
                  <span className="text-xs text-[#41493e] font-semibold">
                    Đặt làm địa chỉ mặc định
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-[#41493e] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Trở lại
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#00450d] text-white text-xs font-bold hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  {addressSubmitting ? "Đang lưu..." : "Hoàn thành"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}