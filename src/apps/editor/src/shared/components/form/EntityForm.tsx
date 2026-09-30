import type { ReactNode } from "react";

export type EntityFieldType = "text" | "number" | "textarea" | "date" | "boolean";

export interface EntityFormField {
  name: string;
  label: string;
  type?: EntityFieldType;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
}

export type EntityFormValue = string | number | boolean | null | undefined;

export interface EntityFormProps {
  fields: EntityFormField[];
  values: Record<string, EntityFormValue>;
  onChange: (name: string, value: string | boolean) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
  children?: ReactNode;
}

export function EntityForm({
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel = "Save",
  submitting = false,
  error,
  children,
}: EntityFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.name];

          return (
            <label
              key={field.name}
              className={
                field.type === "textarea"
                  ? "space-y-2 md:col-span-2"
                  : "space-y-2"
              }
            >
              <span className="block text-xs font-medium text-slate-400">
                {field.label}
              </span>

              {field.type === "textarea" ? (
                <textarea
                  value={String(value ?? "")}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={field.disabled || submitting}
                  placeholder={field.placeholder}
                  className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30 disabled:opacity-50"
                />
              ) : field.type === "boolean" ? (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm text-slate-300">
                    {field.placeholder ?? "Enabled"}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) =>
                      onChange(field.name, event.target.checked)
                    }
                    disabled={field.disabled || submitting}
                  />
                </div>
              ) : (
                <input
                  type={field.type ?? "text"}
                  value={String(value ?? "")}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required}
                  disabled={field.disabled || submitting}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30 disabled:opacity-50"
                />
              )}
            </label>
          );
        })}
      </div>

      {children}

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
