/* Shared storefront header for guests, customers, and admin preview. */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BadgeCheck,
  Menu,
  ShoppingBag,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";
import { publicApi } from "../../services/publicApi";
import HeaderUserMenu from "./header/HeaderUserMenu";
import MobileNavDrawer from "./header/MobileNavDrawer";

export default function StorefrontHeader() {
  const { user } = useAuth();
  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );
  const { items } = useCart();
  const location = useLocation();
  const isCompactStorefrontPage =
    location.pathname.startsWith("/products/") ||
    location.pathname === "/trace" ||
    location.pathname.startsWith("/trace/");

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const cartCount = Array.isArray(items)
    ? items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const isCurrentActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const prefetchCatalog = () => {
    import("../../pages/public/ProductCatalogPage").catch(() => {});
    publicApi.getCategories().catch(() => {});
    publicApi.getProducts({ per_page: 48 }).catch(() => {});
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 bg-white/95 backdrop-blur-md ${
        isScrolled
          ? "border-b border-[#c0c9bb]/40 shadow-xs"
          : "border-b border-[#c0c9bb]/20"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className={`h-20 flex items-center justify-between ${
            isCompactStorefrontPage ? "gap-2 sm:gap-4" : "gap-4"
          }`}
        >
          {/* ================= ZONE 1: BRAND LOGO (LEFT) ================= */}
          <Link
            to="/"
            onClick={closeMenus}
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none select-none"
            aria-label="XanhFarm Trang Chủ"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#00450d] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-[20px] text-[#00450d] tracking-tight leading-tight group-hover:text-[#006e1c] transition-colors">
                XanhFarm
              </span>
              <span className="text-[10px] font-bold tracking-wider text-[#00450d] uppercase mt-0.5 whitespace-nowrap">
                NÔNG SẢN HỮU CƠ SẠCH
              </span>
            </div>
          </Link>

          {/* ================= ZONE 2: NAVIGATION LINKS (CENTER) ================= */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden lg:flex items-center gap-6 xl:gap-8"
          >
            <Link
              to="/"
              className={`relative py-1 text-[14px] font-semibold transition-all duration-150 whitespace-nowrap ${
                isCurrentActive("/")
                  ? "text-[#00450d] font-bold"
                  : "text-[#41493e] hover:text-[#00450d]"
              }`}
            >
              <span>Trang Chủ</span>
              {isCurrentActive("/") && (
                <span className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-[#00450d] rounded-full" />
              )}
            </Link>

            <Link
              to="/products"
              onMouseEnter={prefetchCatalog}
              className={`relative py-1 text-[14px] font-semibold transition-all duration-150 whitespace-nowrap ${
                isCurrentActive("/products")
                  ? "text-[#00450d] font-bold"
                  : "text-[#41493e] hover:text-[#00450d]"
              }`}
            >
              <span>Nông Sản</span>
              {isCurrentActive("/products") && (
                <span className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-[#00450d] rounded-full" />
              )}
            </Link>

            <Link
              to="/brand"
              className={`relative py-1 text-[14px] font-semibold transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                isCurrentActive("/brand")
                  ? "text-[#00450d] font-bold"
                  : "text-[#41493e] hover:text-[#00450d]"
              }`}
            >
              <BadgeCheck className="w-4 h-4 text-[#006e1c] shrink-0" />
              <span>Câu Chuyện & Chứng Nhận</span>
              {isCurrentActive("/brand") && (
                <span className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-[#00450d] rounded-full" />
              )}
            </Link>

            {(!user || user.role === "customer" || user.role === "admin") && (
              <Link
                to="/subscriptions"
                className={`relative py-1 text-[14px] font-semibold transition-all duration-150 whitespace-nowrap flex items-center gap-1.5 ${
                  isCurrentActive("/subscriptions")
                    ? "text-[#00450d] font-bold"
                    : "text-[#006e1c] hover:text-[#00450d]"
                }`}
              >
                <span>Gói Định Kỳ</span>
                {isCurrentActive("/subscriptions") && (
                  <span className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-[#00450d] rounded-full" />
                )}
              </Link>
            )}

            <a
              href="#lien-he"
              onClick={(e) => {
                e.preventDefault();
                const footerEl = document.querySelector("footer");
                if (footerEl) {
                  footerEl.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="relative py-1 text-[14px] font-semibold text-[#41493e] hover:text-[#00450d] transition-colors duration-150 whitespace-nowrap"
            >
              <span>Liên Hệ</span>
            </a>
          </nav>

          {/* ================= ZONE 3: ACTIONS & AUTH (RIGHT) ================= */}
          <div
            className={`flex items-center shrink-0 ${
              isCompactStorefrontPage ? "gap-1 sm:gap-3" : "gap-2 sm:gap-3"
            }`}
          >
            {!isInternalStaff && (
              <Link
                to="/cart"
                className="relative p-2 rounded-full text-[#191c1b] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                aria-label={`Giỏ hàng nông sản, hiện có ${cartCount} sản phẩm`}
              >
                <ShoppingBag className="w-5 h-5 text-[#191c1b]" />
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#f2f4f2] text-[#41493e] border border-[#c0c9bb]/40 font-bold text-[10.5px] flex items-center justify-center leading-none">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              </Link>
            )}

            <HeaderUserMenu
              isCompactStorefrontPage={isCompactStorefrontPage}
              isUserMenuOpen={isUserMenuOpen}
              setIsUserMenuOpen={setIsUserMenuOpen}
              userMenuRef={userMenuRef}
              closeMenus={closeMenus}
            />

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl text-[#00450d] hover:bg-[#f2f4f2] transition-colors focus:outline-none"
              aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        closeMenus={closeMenus}
        prefetchCatalog={prefetchCatalog}
      />
    </header>
  );
}