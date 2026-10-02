export function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" />
    </label>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return <Field label={label} value={value === undefined ? "" : String(value)} onChange={(next) => onChange(next === "" ? undefined : Number(next))} />;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</div>
      <div className="mt-2 text-sm text-slate-300">{value}</div>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-600">{message}</div>;
}