/* API calls for Admin reports, user accounts, and system settings. */
import axiosClient from "./axiosClient";

let dashboardMetricsCache = null;

export const adminApi = {
  // Báo cáo tổng quan dashboard
  getDashboardMetrics: async (force = false) => {
    if (!force && dashboardMetricsCache) {
      return dashboardMetricsCache;
    }
    const res = await axiosClient.get("/admin/reports/dashboard");
    dashboardMetricsCache = res;
    return res;
  },

  // Quản lý người dùng & phân quyền
  getUsers: (params) => axiosClient.get("/admin/users", { params }),
  createStaffAccount: (data) => axiosClient.post("/admin/users/staff", data),
  updateUser: (userId, data) => axiosClient.put(`/admin/users/${userId}`, data),
  toggleUserStatus: (userId, data) =>
    axiosClient.patch(`/admin/users/${userId}/toggle-status`, data),
  updateUserStatus: (userId, status) =>
    axiosClient.put(`/admin/users/${userId}/status`, { status }),
  getRolesAndPermissions: () => axiosClient.get("/admin/roles"),
  updateRolePermissions: (role, permissions) =>
    axiosClient.put(`/admin/roles/${encodeURIComponent(role)}/permissions`, { permissions }),

  // Cấu hình hệ thống
  getSettings: () => axiosClient.get("/admin/settings"),
  updateSettings: (data) => axiosClient.put("/admin/settings", data),


  // 1. Quản lý Danh mục nông sản
  getCategories: () => axiosClient.get("/admin/categories"),
  createCategory: (data) => axiosClient.post("/admin/categories", data),
  updateCategory: (id, data) => axiosClient.put(`/admin/categories/${id}`, data),
  updateCategoryStatus: (id, status) =>
    axiosClient.patch(`/admin/categories/${id}/status`, { Trang_thai: status }),
  deleteCategory: (id) => axiosClient.delete(`/admin/categories/${id}`),

  // 2. Quản lý Sản phẩm nông sản
  getProducts: (params) => axiosClient.get("/admin/products", { params }),
  createProduct: (formData) =>
    axiosClient.post("/admin/products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateProduct: (id, formData) => {
    if (formData instanceof FormData) {
      formData.append("_method", "PUT");
      return axiosClient.post(`/admin/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return axiosClient.put(`/admin/products/${id}`, formData);
  },
  updateProductStatus: (id, status) =>
    axiosClient.patch(`/admin/products/${id}/status`, { Trang_thai: status }),
  deleteProduct: (id) => axiosClient.delete(`/admin/products/${id}`),


  // Quản lý gói định kỳ
  // 3. Quản lý Gói rau định kỳ
  getSubscriptions: () => axiosClient.get("/admin/subscriptions"),
  createSubscription: (data) => axiosClient.post("/admin/subscriptions", data),
  updateSubscription: (id, data) => axiosClient.put(`/admin/subscriptions/${id}`, data),
  updateSubscriptionStatus: (id, status) =>
    axiosClient.patch(`/admin/subscriptions/${id}/status`, { Trang_thai: status }),
  deleteSubscription: (id) => axiosClient.delete(`/admin/subscriptions/${id}`),


  // Cấu hình thông tin & hình ảnh nông trại
  getFarmSettings: () => axiosClient.get("/admin/settings/farm"),
  updateFarmSettings: (formData) => {
    if (formData instanceof FormData) {
      formData.append("_method", "PUT");
      return axiosClient.post("/admin/settings/farm", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return axiosClient.put("/admin/settings/farm", formData);
  },
  deleteFarmImage: (imageId) =>
    axiosClient.delete(`/admin/settings/farm/images/${imageId}`),

  geocodeFarmAddress: (address) =>
    axiosClient.post("/admin/settings/farm/geocode", { address }),
};
