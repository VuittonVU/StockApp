export default function PopupModal({
  open,
  title = "Pemberitahuan",
  message = "",
  confirmText = "Oke",
  cancelText = "",
  onConfirm,
  onCancel,
  variant = "info",
}) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-black">{title}</h3>
        <p className="mt-3 text-base text-black">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          {cancelText ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-black bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
            >
              {cancelText}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
              isDanger ? "bg-black" : "bg-black"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}