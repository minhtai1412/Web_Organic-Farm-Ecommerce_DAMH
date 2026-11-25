import { useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

const FAILURE_REASONS = [
  "Khách không nghe máy",
  "Sai địa chỉ giao hàng",
  "Khách từ chối nhận hàng",
  "Hư hỏng trong quá trình vận chuyển",
];

export default function DeliveryResultModal({
  order,
  mode,
  codPending,
  busy,
  onClose,
  onSubmit,
}) {
  const [codCollected, setCodCollected] = useState(false);
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [localError, setLocalError] = useState("");

  if (!order || !mode) return null;

  const isSuccess = mode === "success";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSuccess && codPending && !codCollected) {
      setLocalError("Vui lòng xác nhận đã thu đủ tiền COD trước khi hoàn tất.");
      return;
    }
    if (!isSuccess && !reason.trim()) {
      setLocalError("Vui lòng nhập lý do giao hàng thất bại.");
      return;
    }
    if (!isSuccess && !condition) {
      setLocalError("Vui lòng chọn tình trạng hàng hoàn về.");
      return;
    }

    setLocalError("");
    const payload = isSuccess
      ? { cod_collected: codCollected }
      : {
          ly_do_that_bai: reason.trim(),
          tinh_trang_hang_hoan: condition,
        };
    const saved = await onSubmit(payload);
    if (saved) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-result-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[#c0c9bb]/30 p-5">
          <div className="flex items-start gap-3">
            <span className={`rounded-xl p-2 ${isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {isSuccess
                ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                : <XCircle className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div>
              <h2 id="delivery-result-title" className="text-lg font-bold text-[#00450d]">
                {isSuccess ? "Xác nhận giao thành công" : "Ghi nhận giao hàng thất bại"}
              </h2>
              <p className="mt-1 text-sm text-[#5a6357]">Đơn hàng #{order.order_id}</p>
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
          {isSuccess ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-700">
                Xác nhận đơn hàng đã được giao đến khách hàng. Hệ thống sẽ cập nhật thanh toán và điểm thưởng nếu đủ điều kiện.
              </p>
              {codPending && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  <input
                    type="checkbox"
                    checked={codCollected}
                    onChange={(event) => setCodCollected(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-emerald-700"
                  />
                  <span className="font-semibold">
                    Đã thu đủ tiền COD từ shipper/khách hàng và xác nhận cộng điểm thưởng cho khách.
                  </span>
                </label>
              )}
            </div>
          ) : (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                Lý do giao thất bại <span className="text-red-600">*</span>
                <input
                  list="delivery-failure-reasons"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Chọn gợi ý hoặc nhập lý do cụ thể"
                />
                <datalist id="delivery-failure-reasons">
                  {FAILURE_REASONS.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>

              <fieldset>
                <legend className="text-sm font-semibold text-slate-700">
                  Tình trạng hàng hoàn về <span className="text-red-600">*</span>
                </legend>
                <div className="mt-2 grid gap-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${condition === "con_tuoi" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
                    <input
                      type="radio"
                      name="return-condition"
                      value="con_tuoi"
                      checked={condition === "con_tuoi"}
                      onChange={(event) => setCondition(event.target.value)}
                      className="mt-1 accent-emerald-700"
                    />
                    <span>
                      <strong className="block text-slate-800">Còn tươi & còn hạn sử dụng</strong>
                      <span className="text-xs text-slate-600">Hoàn tồn kho về lô gốc để tiếp tục bán.</span>
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${condition === "hu_hong" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
                    <input
                      type="radio"
                      name="return-condition"
                      value="hu_hong"
                      checked={condition === "hu_hong"}
                      onChange={(event) => setCondition(event.target.value)}
                      className="mt-1 accent-red-700"
                    />
                    <span>
                      <strong className="block text-slate-800">Dập nát / Hết hạn sử dụng</strong>
                      <span className="text-xs text-slate-600">Không hoàn vào tồn kho bán; ghi nhận xuất hủy.</span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </>
          )}

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
              Đóng
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${isSuccess ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800"}`}
            >
              {busy ? "Đang cập nhật..." : isSuccess ? "Xác nhận đã giao" : "Xác nhận giao thất bại"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
