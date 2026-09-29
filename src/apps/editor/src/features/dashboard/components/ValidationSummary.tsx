import {
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export function ValidationSummary({
  warnings,
  errors,
}: {
  warnings: number;
  errors: number;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 text-[11px] font-semibold tracking-[0.2em] text-slate-600">
        VALIDATION
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ValidationItem
          label="Warnings"
          value={warnings}
          icon={AlertTriangle}
        />

        <ValidationItem
          label="Errors"
          value={errors}
          icon={AlertCircle}
        />
      </div>
    </section>
  );
}

function ValidationItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof AlertCircle;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon
          size={16}
          className="text-slate-500"
        />

        <span className="text-sm text-slate-400">
          {label}
        </span>
      </div>

      <span className="text-lg font-semibold text-white">
        {value}
      </span>
    </div>
  );
}