// Thay thế toàn bộ file src/src/components/navigation/header/HeaderUserMenu.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Receipt,
  User,
} from "lucide-react";
import { useAuth } from "../../../context/useAuth";

export default function HeaderUserMenu({
  isCompactStorefrontPage,
  isUserMenuOpen,
  setIsUserMenuOpen,
  userMenuRef,
  closeMenus,
}) {
  const { user, logout, openLoginModal, openRegisterModal } = useAuth();
  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsUserMenuOpen, userMenuRef]);

  const getDashboardRedirect = () => {
    if (user?.role === "farm_staff") return "/farm/seasons";
    if (user?.role === "sales") return "/sales/orders";
    if (user?.role === "admin") return "/admin";
    return "/";
  };

  return (
    <div className={isCompactStorefrontPage ? "hidden sm:block" : ""}>
      {!user ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              closeMenus();
              openLoginModal();
            }}
            className="px-4 py-2 rounded-xl text-[13.5px] font-semibold text-[#00450d] bg-[#f2f4f2] hover:bg-[#e6eae6] transition-colors whitespace-nowrap cursor-pointer"
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              closeMenus();
              openRegisterModal();
            }}
            className="px-4 py-2 rounded-xl text-[13.5px] font-semibold text-white bg-[#00450d] hover:bg-[#006e1c] transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            Đăng ký
          </button>
        </div>
      ) : (
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-[#c0c9bb]/40 bg-[#f2f4f2]/70 hover:bg-white hover:border-[#00450d]/40 transition-all cursor-pointer focus:outline-none"
            aria-expanded={isUserMenuOpen}
            aria-label="Menu tài khoản"
          >
            <div className="w-8 h-8 rounded-full bg-[#00450d] text-white flex items-center justify-center font-bold text-[13px] shrink-0 overflow-hidden border border-[#c0c9bb]/40">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (user.name || user.email || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left hidden md:block max-w-[120px]">
              <p className="text-[12.5px] font-bold text-[#00450d] truncate leading-tight">
                {user.name || "Khách hàng"}
              </p>
              <p className="text-[10px] text-[#5a6357] font-semibold truncate leading-tight">
                {user.role === "admin"
                  ? "Quản trị viên"
                  : user.role === "sales"
                    ? "Nhân viên bán hàng"
                    : user.role === "farm_staff"
                      ? "Kỹ sư nông trại"
                      : "Khách hàng"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5a6357] shrink-0" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#c0c9bb]/40 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-[#c0c9bb]/20">
                <p className="text-[13px] font-bold text-[#191c1b] truncate">
                  {user.name || "Khách hàng"}
                </p>
                <p className="text-[11px] text-[#5a6357] truncate font-mono mt-0.5">
                  {user.email}
                </p>
              </div>

              <div className="py-1">
                {!isInternalStaff && (
                  <>
                    <Link
                      to="/rewards?tab=orders"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#41493e] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors"
                    >
                      <Receipt className="w-4 h-4 text-[#5a6357]" />
                      <span>Đơn hàng của tôi</span>
                    </Link>
                    <Link
                      to="/rewards?tab=rewards"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#41493e] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors"
                    >
                      <Award className="w-4 h-4 text-[#5a6357]" />
                      <span>Ví điểm thưởng</span>
                    </Link>
                    <Link
                      to="/rewards?tab=address"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#41493e] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-[#5a6357]" />
                      <span>Sổ địa chỉ giao hàng</span>
                    </Link>
                    <Link
                      to="/rewards?tab=profile"
                      onClick={closeMenus}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[#41493e] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#5a6357]" />
                      <span>Hồ sơ &amp; Bảo mật</span>
                    </Link>
                  </>
                )}
                {isInternalStaff && (
                  <Link
                    to={getDashboardRedirect()}
                    onClick={closeMenus}
                    className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-bold text-[#00450d] hover:bg-[#f2f4f2] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#006e1c]" />
                    <span>Vào trang làm việc nội bộ</span>
                  </Link>
                )}
              </div>

              <div className="pt-1 mt-1 border-t border-[#c0c9bb]/20">
                <button
                  type="button"
                  onClick={() => {
                    closeMenus();
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}