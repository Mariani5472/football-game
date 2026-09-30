import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { editorApi } from "../../api/editorApi";

export interface EntityPickerOption {
  id: number | string;
  label: string;
}

interface EntityPickerProps {
  label?: string;
  value: number | string | "";
  options?: EntityPickerOption[];
  table?: string;
  labelColumn?: string;
  searchColumn?: string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  loading?: boolean;
  error?: string | null;
}

export function EntityPicker({
  label,
  value,
  options,
  table,
  labelColumn = "name",
  searchColumn,
  onChange,
  placeholder = "Select...",
  loading,
  error,
}: EntityPickerProps) {
  const [remoteOptions, setRemoteOptions] = useState<EntityPickerOption[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!table) return;
    let active = true;
    setRemoteLoading(true);
    setRemoteError(null);
    void editorApi.list(table, { page: 1, pageSize: 100, orderBy: labelColumn, orderDirection: "ASC", search: undefined })
      .then((result) => {
        if (!active) return;
        setRemoteOptions(result.rows.map((row) => ({
          id: row.id ?? String(row["id"]),
          label: String(row[labelColumn] ?? row.name ?? row.id),
        })));
      })
      .catch((cause) => {
        if (active) setRemoteError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setRemoteLoading(false);
      });
    return () => { active = false; };
  }, [table, labelColumn]);

  const resolvedOptions = options ?? remoteOptions;
  const isLoading = loading ?? remoteLoading;
  const resolvedError = error ?? remoteError;

  return (
    <label className="space-y-2">
      {label && <span className="block text-xs font-medium text-slate-400">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading || Boolean(resolvedError)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 pr-9 text-sm text-slate-200 outline-none focus:border-emerald-400/30 disabled:opacity-50"
        >
          <option value="" className="bg-[#121820]">{isLoading ? "Loading..." : placeholder}</option>
          {resolvedOptions.map((option) => (
            <option key={String(option.id)} value={String(option.id)} className="bg-[#121820]">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
      </div>
      {resolvedError && <span className="block text-xs text-red-300">{resolvedError}</span>}
    </label>
  );
}