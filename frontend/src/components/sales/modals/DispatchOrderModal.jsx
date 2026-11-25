import { useState } from "react";
import { Truck, X } from "lucide-react";

const CARRIERS = [
  "Giao Hàng Nhanh",
  "Giao Hàng Tiết Kiệm",
  "Viettel Post",
  "Ahamove",
  "Đội xe nội bộ XanhFarm",
  "Khác",
];

export default function DispatchOrderModal({ order, busy, onClose, onSubmit }) {
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [customCarrier, setCustomCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState("");

  if (!order) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selectedCarrier = carrier === "Khác" ? customCarrier.trim() : carrier;
    if (!selectedCarrier) {
      setLocalError("Vui lòng nhập tên đơn vị vận chuyển.");
      return;
    }
    if (!trackingNumber.trim()) {
      setLocalError("Vui lòng nhập mã vận đơn.");
      return;
    }

    setLocalError("");
    const saved = await onSubmit({
      don_vi_van_chuyen: selectedCarrier,
      ma_van_don: trackingNumber.trim(),
      ghi_chu: note.trim() || undefined,
    });
    if (saved) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-order-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[#c0c9bb]/30 p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="dispatch-order-title" className="text-lg font-bold text-[#00450d]">
                Điều phối đơn hàng #{order.order_id}
              </h2>
              <p className="mt-1 text-sm text-[#5a6357]">
                Nhập thông tin vận chuyển trước khi bàn giao đơn cho đơn vị giao hàng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block text-sm font-semibold text-slate-700">
            Đơn vị vận chuyển <span className="text-red-600">*</span>
            <select
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {CARRIERS.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>

          {carrier === "Khác" && (
            <label className="block text-sm font-semibold text-slate-700">
              Tên đơn vị vận chuyển <span className="text-red-600">*</span>
              <input
                autoFocus
                value={customCarrier}
                onChange={(event) => setCustomCarrier(event.target.value)}
                maxLength={100}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Nhập tên đơn vị vận chuyển"
              />
            </label>
          )}

          <label className="block text-sm font-semibold text-slate-700">
            Mã vận đơn <span className="text-red-600">*</span>
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              maxLength={100}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Ví dụ: GHN123456789"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Ghi chú điều phối
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Thông tin cần lưu ý khi bàn giao đơn"
            />
          </label>

          {localError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {localError}
            </p>
          )}

          <footer className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[#08712b] px-4 text-sm font-bold text-white hover:bg-[#075b25] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Đang lưu điều phối..." : "Xác nhận điều phối"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
