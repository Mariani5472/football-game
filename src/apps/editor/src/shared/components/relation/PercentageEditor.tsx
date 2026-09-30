interface PercentageEditorProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function PercentageEditor({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.01,
}: PercentageEditorProps) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" min={min} max={max} step={step} value={value ?? 0}
        onChange={event => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white outline-none" />
      <span className="text-xs text-slate-600">%</span>
    </div>
  );
}
