import { ChevronDown } from "lucide-react";

export interface EntityPickerOption {
  id: number | string;
  label: string;
}

interface EntityPickerProps {
  label?: string;
  value: number | string | "";
  options: EntityPickerOption[];
  onChange: (value: number | string) => void;
  placeholder?: string;
}

export function EntityPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
}: EntityPickerProps) {
  return (
    <label className="space-y-2">
      {label && (
        <span className="block text-xs font-medium text-slate-400">{label}</span>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 pr-9 text-sm text-slate-200 outline-none focus:border-emerald-400/30"
        >
          <option value="" className="bg-[#121820]">
            {placeholder}
          </option>

          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-[#121820]">
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
        />
      </div>
    </label>
  );
}