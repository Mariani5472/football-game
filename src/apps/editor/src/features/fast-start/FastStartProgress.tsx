export interface FastStartStepState {
  key: string;
  label: string;
  status: "PENDING" | "DONE";
}

export function FastStartProgress({ steps }: { steps: FastStartStepState[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {steps.map(step => (
        <div
          key={step.key}
          className={
            "rounded-xl border p-3 " +
            (step.status === "DONE"
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-white/10 bg-white/[0.02]")
          }
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-200">{step.label}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {step.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
