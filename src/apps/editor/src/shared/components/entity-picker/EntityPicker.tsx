import { Search, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  disabled?: boolean;
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
  disabled = false,
}: EntityPickerProps) {
  const [remoteOptions, setRemoteOptions] = useState<EntityPickerOption[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!table || options) return;

    let active = true;
    setRemoteLoading(true);
    setRemoteError(null);

    void editorApi.entity
      .list(table, {
        page: 1,
        pageSize: 1000,
        orderBy: labelColumn,
        orderDirection: "ASC",
        searchColumns: searchColumn ? [searchColumn] : undefined,
      })
      .then(result => {
        if (!active) return;

        setRemoteOptions(
          result.rows
            .filter(row => row.id != null)
            .map(row => ({
              id: row.id as number | string,
              label: String(
                row[labelColumn] ??
                  row.name ??
                  row.short_name ??
                  row.id,
              ),
            })),
        );
      })
      .catch((cause: unknown) => {
        if (active) {
          setRemoteError(
            cause instanceof Error ? cause.message : String(cause),
          );
        }
      })
      .finally(() => {
        if (active) setRemoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [table, options, labelColumn, searchColumn]);

  const resolvedOptions = options ?? remoteOptions;
  const filteredOptions = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return resolvedOptions;
    return resolvedOptions.filter(option =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [resolvedOptions, search]);

  const isLoading = loading ?? remoteLoading;
  const resolvedError = error ?? remoteError;
  const isDisabled = disabled || isLoading || Boolean(resolvedError);

  return (
    <label className="block space-y-2">
      {label && (
        <span className="block text-xs font-medium text-slate-400">
          {label}
        </span>
      )}

      <div className="relative">
        {resolvedOptions.length > 20 && (
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />
        )}

        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={isDisabled}
          className={[
            "w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 pr-9 text-sm text-slate-200 outline-none focus:border-emerald-400/30 disabled:opacity-50",
            resolvedOptions.length > 20 ? "pl-9" : "",
          ].join(" ")}
        >
          <option value="" className="bg-[#121820]">
            {isLoading ? "Loading..." : placeholder}
          </option>
          {filteredOptions.map(option => (
            <option
              key={String(option.id)}
              value={String(option.id)}
              className="bg-[#121820]"
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
        />
      </div>

      {resolvedOptions.length > 20 && (
        <input
          aria-label={`Filter ${label ?? "options"}`}
          value={search}
          onChange={event => setSearch(event.target.value)}
          disabled={isDisabled}
          placeholder="Filter options..."
          className="w-full rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-700 focus:border-emerald-400/20 disabled:opacity-50"
        />
      )}

      {resolvedError && (
        <span className="block text-xs text-red-300">{resolvedError}</span>
      )}
    </label>
  );
}
