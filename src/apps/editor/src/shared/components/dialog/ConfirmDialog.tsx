import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  children,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121820] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {children}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}