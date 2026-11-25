import { useEffect, useRef, useState } from "react";
import { LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, UnlockKeyhole, Users } from "lucide-react";
import Pagination from "../../components/common/Pagination";
import UserAccountModal from "../../components/admin/modals/UserAccountModal";
import UserPermissionModal from "../../components/admin/modals/UserPermissionModal";
import { showGlobalToast } from "../../components/GlobalToast";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { adminApi } from "../../services/adminApi";

const ROLE_COLORS = {
  Admin: "border-violet-200 bg-violet-50 text-violet-800",
  Sales: "border-sky-200 bg-sky-50 text-sky-800",
  Farm_Staff: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Customer: "border-amber-200 bg-amber-50 text-amber-800",
};

const ROLE_LABELS = {
  Admin: "Quản trị viên",
  Sales: "Nhân viên Sales",
  Farm_Staff: "Farm Staff",
  Customer: "Khách hàng",
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value))
  : "—";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-[#00450d]">{value ?? 0}</p>
      </div>
      <span className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><Icon className="h-5 w-5" /></span>
    </div>
  );
}

export default function UserManagementPage() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const searchTimer = useRef(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [accountTarget, setAccountTarget] = useState(undefined);
  const [lockTarget, setLockTarget] = useState(null);
  const [lockReason, setLockReason] = useState("");
  const [busy, setBusy] = useState(false);

  const requestKey = JSON.stringify([search, roleFilter, statusFilter, page, refreshKey]);
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      }),
      adminApi.getRolesAndPermissions(),
    ])
      .then(([usersResponse, rolesResponse]) => {
        if (!active) return;
        const usersPayload = usersResponse.data?.data || {};
        const rolesPayload = rolesResponse.data?.data || {};
        setUsers(usersPayload.users || []);
        setStats(usersPayload.stats || {});
        setMeta(usersResponse.data?.meta || { current_page: 1, last_page: 1, per_page: 15, total: 0 });
        setRoles(rolesPayload.roles || []);
        setPermissionGroups(rolesPayload.permission_groups || []);
      })
      .catch((error) => {
        if (active) notifyApiErrorToast(error, "Không thể tải dữ liệu tài khoản và phân quyền.");
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [search, roleFilter, statusFilter, page, refreshKey, requestKey]);

  useEffect(() => () => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
  }, []);

  const refresh = () => setRefreshKey((value) => value + 1);

  const saveAccount = (message) => {
    setAccountTarget(undefined);
    showGlobalToast(message, "success");
    refresh();
  };

  const submitLock = async (event) => {
    event.preventDefault();
    if (!lockTarget || !lockReason.trim()) {
      showGlobalToast("Vui lòng nhập lý do khóa tài khoản.", "warning");
      return;
    }
    setBusy(true);
    try {
      await adminApi.toggleUserStatus(lockTarget.id, { ly_do_khoa: lockReason.trim() });
      setLockTarget(null);
      setLockReason("");
      showGlobalToast(`Đã khóa tài khoản ${lockTarget.name} và thu hồi phiên đăng nhập.`, "success");
      refresh();
    } catch (error) {
      notifyApiErrorToast(error, "Không thể khóa tài khoản.");
    } finally {
      setBusy(false);
    }
  };

  const unlockUser = async (user) => {
    setBusy(true);
    try {
      await adminApi.toggleUserStatus(user.id, {});
      showGlobalToast(`Đã mở khóa tài khoản ${user.name}.`, "success");
      refresh();
    } catch (error) {
      notifyApiErrorToast(error, "Không thể mở khóa tài khoản.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-black text-[#00450d]">Quản lý tài khoản & phân quyền</h1>
          <p className="mt-1 text-sm text-slate-600">Quản lý người dùng, trạng thái đăng nhập và quyền theo vai trò.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </header>

      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setTab("users")} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === "users" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-500"}`}>
          Danh sách tài khoản
        </button>
        <button type="button" onClick={() => setTab("permissions")} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === "permissions" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-500"}`}>
          Ma trận phân quyền
        </button>
      </div>

      {tab === "users" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng tài khoản" value={stats.total} icon={Users} />
            <StatCard label="Nhân viên nội bộ" value={stats.staff} icon={ShieldCheck} />
            <StatCard label="Khách hàng" value={stats.customers} icon={Users} />
            <StatCard label="Đang bị khóa" value={stats.locked} icon={LockKeyhole} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSearchInput(value);
                        if (searchTimer.current) window.clearTimeout(searchTimer.current);
                        searchTimer.current = window.setTimeout(() => {
                          setSearch(value.trim());
                          setPage(1);
                        }, 250);
                      }}
                      placeholder="Tìm họ tên, email, số điện thoại hoặc mã tài khoản"
                      className="min-h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm"
                    />
              </label>
              <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} aria-label="Lọc theo vai trò" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:w-52">
                <option value="">Tất cả vai trò</option>
                {roles.map((role) => <option key={role.id} value={role.name}>{ROLE_LABELS[role.name] || role.name}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Lọc theo trạng thái" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:w-48">
                <option value="">Mọi trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Bị khóa</option>
              </select>
              <button type="button" onClick={() => setAccountTarget(null)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#075b25] px-4 text-sm font-bold text-white hover:bg-[#00450d]">
                <Plus className="h-4 w-4" /> Tạo tài khoản nhân viên
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-500">Đang tải danh sách tài khoản...</p>
            ) : users.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">Không tìm thấy tài khoản phù hợp.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tài khoản</th>
                      <th className="px-4 py-3">Số điện thoại</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Ngày tạo</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-900">{user.name} <span className="text-xs font-normal text-slate-400">#{user.id}</span></p>
                          <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{user.phone || "—"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${ROLE_COLORS[user.role?.name] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                            {ROLE_LABELS[user.role?.name] || user.role?.name}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.status === "Khoa" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
                            {user.status === "Khoa" ? "Bị khóa" : "Đang hoạt động"}
                          </span>
                          {user.lock_reason && <p className="mt-1 max-w-48 text-xs text-red-600">{user.lock_reason}</p>}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAccountTarget(user)} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Chỉnh sửa</button>
                            {user.status === "Khoa" ? (
                              <button type="button" onClick={() => unlockUser(user)} disabled={busy} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-800 disabled:opacity-50">
                                <UnlockKeyhole className="h-3.5 w-3.5" /> Mở khóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy || user.is_current_user}
                                title={user.is_current_user ? "Bạn không thể tự khóa tài khoản đang đăng nhập." : "Khóa tài khoản"}
                                onClick={() => { setLockTarget(user); setLockReason(""); }}
                                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <LockKeyhole className="h-3.5 w-3.5" /> Khóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} itemLabel="tài khoản" />
        </>
      ) : (
        <UserPermissionModal roles={roles} groups={permissionGroups} onSaved={refresh} />
      )}

      {accountTarget !== undefined && (
        <UserAccountModal
          key={accountTarget?.id || "create"}
          user={accountTarget}
          roles={roles}
          onClose={() => setAccountTarget(undefined)}
          onSaved={saveAccount}
        />
      )}

      {lockTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <form onSubmit={submitLock} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Xác nhận khóa tài khoản</h2>
              <p className="mt-1 text-sm text-slate-600">Tài khoản {lockTarget.name} sẽ bị đăng xuất khỏi tất cả thiết bị.</p>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Lý do khóa *
              <textarea required maxLength={1000} rows={4} value={lockReason} onChange={(event) => setLockReason(event.target.value)} className="rounded-xl border border-slate-300 p-3" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setLockTarget(null)} disabled={busy} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold">Hủy</button>
              <button type="submit" disabled={busy} className="min-h-10 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang xử lý..." : "Khóa tài khoản"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
