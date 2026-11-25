import { useState } from "react";
import { X } from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { notifyApiErrorToast } from "../../../services/axiosClient";

const EMPTY_FORM = {
  ho_ten: "",
  email: "",
  so_dien_thoai: "",
  mat_khau: "",
  vai_tro: "",
};

const ROLE_LABELS = {
  Admin: "Quản trị viên",
  Sales: "Nhân viên Sales",
  Farm_Staff: "Farm Staff",
  Customer: "Khách hàng",
};

export default function UserAccountModal({ user, roles, onClose, onSaved }) {
  const [form, setForm] = useState(() => user ? {
    ho_ten: user.name || "",
    email: user.email || "",
    so_dien_thoai: user.phone || "",
    mat_khau: "",
    vai_tro: String(user.role?.id || ""),
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(user);
  const availableRoles = isEditing ? roles : roles.filter((role) => role.slug !== "customer");
  const defaultStaffRole = availableRoles.find((role) => role.slug === "sales") || availableRoles[0];
  const selectedRoleId = form.vai_tro || String(defaultStaffRole?.id || "");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ho_ten: form.ho_ten.trim(),
      email: form.email.trim(),
      so_dien_thoai: form.so_dien_thoai.trim() || null,
      vai_tro: Number(selectedRoleId),
    };
    if (form.mat_khau) payload.mat_khau = form.mat_khau;

    try {
      if (isEditing) await adminApi.updateUser(user.id, payload);
      else await adminApi.createStaffAccount(payload);
      onSaved(isEditing ? "Đã cập nhật tài khoản." : "Đã tạo tài khoản nhân viên.");
    } catch (error) {
      notifyApiErrorToast(error, "Không thể lưu thông tin tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-modal-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="account-modal-title" className="text-lg font-bold text-[#00450d]">
              {isEditing ? "Chỉnh sửa tài khoản" : "Tạo tài khoản nhân viên"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Các trường có dấu * là bắt buộc.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-4 p-5">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Họ và tên *
            <input required maxLength={150} value={form.ho_ten} onChange={(event) => setForm({ ...form, ho_ten: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Email *
            <input required type="email" maxLength={150} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Số điện thoại *
            <input required={!isEditing} type="tel" value={form.so_dien_thoai} onChange={(event) => setForm({ ...form, so_dien_thoai: event.target.value })} placeholder="09xxxxxxxx" className="min-h-11 rounded-xl border border-slate-300 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Vai trò *
            <select required value={selectedRoleId} onChange={(event) => setForm({ ...form, vai_tro: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">
              {availableRoles.map((role) => <option key={role.id} value={role.id}>{ROLE_LABELS[role.name] || role.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            {isEditing ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu khởi tạo *"}
            <input
              required={!isEditing}
              minLength={8}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={form.mat_khau}
              onChange={(event) => setForm({ ...form, mat_khau: event.target.value })}
              className="min-h-11 rounded-xl border border-slate-300 px-3"
            />
            {isEditing && <span className="text-xs font-normal text-slate-500">Mật khẩu mới cần tối thiểu 8 ký tự.</span>}
          </label>
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">Hủy</button>
            <button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-[#075b25] px-4 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu tài khoản"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
