import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { EntityPickerOption } from "../entity-picker/EntityPicker";

interface MultiEntityPickerProps {
  label?: string;
  options: EntityPickerOption[];
  selected: Array<string | number>;
  onChange: (values: Array<string | number>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiEntityPicker({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select entities...",
  disabled = false,
}: MultiEntityPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selected.map(String)), [selected]);
  const selectedLabels = options.filter(option => selectedSet.has(String(option.id)));

  function toggle(id: string | number) {
    const key = String(id);
    if (selectedSet.has(key)) onChange(selected.filter(value => String(value) !== key));
    else onChange([...selected, id]);
  }

  return (
    <div className="relative">
      {label && <div className="mb-2 text-xs font-medium text-slate-400">{label}</div>}
      <button type="button" disabled={disabled} onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-slate-200 disabled:opacity-50">
        <span className="truncate">
          {selectedLabels.length ? selectedLabels.map(option => option.label).join(", ") : placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-slate-600" />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-[#121820] p-1 shadow-2xl">
          {options.map(option => {
            const checked = selectedSet.has(String(option.id));
            return (
              <button key={String(option.id)} type="button" onClick={() => toggle(option.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/[0.04]">
                <span>{option.label}</span>
                {checked && <Check size={14} className="text-emerald-300" />}
              </button>
            );
          })}
          {!options.length && <div className="px-3 py-4 text-xs text-slate-600">No options available.</div>}
        </div>
      )}
    </div>
  );
}
