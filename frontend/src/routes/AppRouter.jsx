/* Declares routes for authentication and the five application areas with lazy code-splitting for maximum speed. */
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import StorefrontLayout from "../layouts/StorefrontLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleGuard from "./RoleGuard";
import CatalogManagePage from "../pages/admin/CatalogManagePage";
import InventoryWastagePage from "../pages/farm/InventoryWastagePage";

// Lazy-loaded pages for bundle splitting & ultra-fast initial page loads
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const SystemSettingsPage = lazy(() => import("../pages/admin/SystemSettingsPage"));
const UserManagementPage = lazy(() => import("../pages/admin/UserManagementPage"));
const SeasonManagePage = lazy(() => import("../pages/farm/SeasonManagePage"));
const BatchHarvestPage = lazy(() => import("../pages/farm/BatchHarvestPage"));
const CertificateManagePage = lazy(() => import("../pages/farm/CertificateManagePage"));
const SalesOrderPage = lazy(() => import("../pages/sales/SalesOrderPage"));
const InventoryFefoPage = lazy(() => import("../pages/sales/InventoryFefoPage"));
const FlashSalePage = lazy(() => import("../pages/sales/FlashSalePage"));
const CustomerClaimPage = lazy(() => import("../pages/sales/CustomerClaimPage"));
const HomePage = lazy(() => import("../pages/public/HomePage"));
const ProductCatalogPage = lazy(() => import("../pages/public/ProductCatalogPage"));
const ProductDetailPage = lazy(() => import("../pages/public/ProductDetailPage"));
const BrandStoryPage = lazy(() => import("../pages/public/BrandStoryPage"));
const QrTraceabilityPage = lazy(() => import("../pages/public/QrTraceabilityPage"));
const CartPage = lazy(() => import("../pages/customer/CartPage"));
const CheckoutPage = lazy(() => import("../pages/customer/CheckoutPage"));
const SubscriptionRegisterPage = lazy(() => import("../pages/customer/SubscriptionRegisterPage"));
const OrderHistoryPage = lazy(() => import("../pages/customer/OrderHistoryPage"));
const RewardWalletPage = lazy(() => import("../pages/customer/RewardWalletPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const ApiTestPage = lazy(() => import("../pages/ApiTestPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] p-8">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<StorefrontLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductCatalogPage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="brand" element={<BrandStoryPage />} />
            <Route path="trace" element={<QrTraceabilityPage />} />
            <Route path="trace/:code" element={<QrTraceabilityPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard roles={["customer", "admin"]} />}>
                <Route path="subscriptions" element={<SubscriptionRegisterPage />} />
              </Route>
              <Route element={<RoleGuard roles={["customer"]} />}>
                <Route path="cart" element={<CartPage />} />
                <Route path="checkout" element={<CheckoutPage />} />
                <Route path="orders" element={<Navigate to="/rewards?tab=orders" replace />} />
                <Route path="rewards" element={<RewardWalletPage />} />
                <Route path="profile" element={<RewardWalletPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route element={<RoleGuard roles={["farm_staff"]} />}>
                <Route path="farm/seasons" element={<SeasonManagePage />} />
                <Route path="farm/batches" element={<BatchHarvestPage />} />
                <Route path="farm/certificates" element={<CertificateManagePage />} />
                <Route path="farm/disposals" element={<InventoryWastagePage />} />
              </Route>
              <Route element={<RoleGuard roles={["sales"]} />}>
                <Route path="sales/orders" element={<SalesOrderPage />} />
                <Route path="sales/inventory" element={<InventoryFefoPage />} />
                <Route path="sales/flash-sales" element={<FlashSalePage />} />
                <Route path="sales/claims" element={<CustomerClaimPage />} />
              </Route>
              <Route element={<RoleGuard roles={["admin"]} />}>
                <Route path="admin" element={<AdminDashboardPage />} />
                <Route path="admin/dashboard" element={<Navigate to="/admin" replace />} />
                <Route path="admin/catalog" element={<CatalogManagePage />} />
                <Route path="admin/users" element={<UserManagementPage />} />
                <Route path="admin/settings" element={<SystemSettingsPage />} />
              </Route>
            </Route>
          </Route>

          {import.meta.env.DEV && <Route path="test-api" element={<ApiTestPage />} />}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}