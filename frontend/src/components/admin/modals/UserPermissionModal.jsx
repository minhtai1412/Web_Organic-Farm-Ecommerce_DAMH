import { useMemo, useState } from "react";
import { LockKeyhole, Save } from "lucide-react";
import { showGlobalToast } from "../../GlobalToast";
import { notifyApiErrorToast } from "../../../services/axiosClient";
import { adminApi } from "../../../services/adminApi";

const ROLE_LABELS = {
  Admin: "Quản trị viên",
  Sales: "Nhân viên Sales",
  Farm_Staff: "Farm Staff",
  Customer: "Khách hàng",
};

export default function UserPermissionModal({ roles, groups, onSaved }) {
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permissionSelection, setPermissionSelection] = useState(null);
  const [saving, setSaving] = useState(false);

  const role = useMemo(
    () => roles.find((item) => String(item.id) === String(selectedRoleId || roles[0]?.id)),
    [roles, selectedRoleId],
  );
  const restricted = new Set(role?.restricted_permissions || []);
  const permissions = permissionSelection?.roleId === role?.id
    ? permissionSelection.permissions
    : role?.permissions || [];

  const togglePermission = (permissionName, enabled) => {
    setPermissionSelection((currentSelection) => {
      const current = currentSelection?.roleId === role?.id
        ? currentSelection.permissions
        : role?.permissions || [];
      return {
        roleId: role?.id,
        permissions: enabled
          ? [...new Set([...current, permissionName])]
          : current.filter((name) => name !== permissionName),
      };
    });
  };

  const save = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await adminApi.updateRolePermissions(
        role.name,
        permissions.filter((permission) => !restricted.has(permission)),
      );
      showGlobalToast(`Đã lưu phân quyền cho vai trò ${role.name}.`, "success");
      onSaved?.();
    } catch (error) {
      notifyApiErrorToast(error, "Không thể lưu cấu hình phân quyền.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:w-72">
          Vai trò cần cấu hình
          <select
            value={role?.id || ""}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
          >
            {roles.map((item) => (
              <option key={item.id} value={item.id}>{ROLE_LABELS[item.name] || item.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={!role || saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#075b25] px-4 font-bold text-white hover:bg-[#00450d] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Đang lưu..." : "Lưu cấu hình phân quyền"}
        </button>
      </div>

      {role?.slug === "farm_staff" && (
        <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          Quyền doanh thu, tài chính và thông tin khách hàng bị khóa theo chính sách bảo mật.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.name} className="overflow-hidden rounded-2xl border border-slate-200">
            <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800">
              {group.name}
            </h3>
            <div className="divide-y divide-slate-100">
              {group.permissions.map((permission) => {
                const isRestricted = restricted.has(permission.name);
                const isEnabled = !isRestricted && permissions.includes(permission.name);
                return (
                  <label key={permission.name} className={`flex items-start gap-3 px-4 py-3 ${isRestricted ? "bg-slate-50" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={isRestricted || saving}
                      onChange={(event) => togglePermission(permission.name, event.target.checked)}
                      className="mt-1 h-4 w-4 accent-emerald-700 disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{permission.description}</span>
                      <span className="text-xs text-slate-500">{permission.name}</span>
                      {isRestricted && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                          <LockKeyhole className="h-3 w-3" />
                          Không áp dụng cho Farm Staff theo chính sách bảo mật
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
