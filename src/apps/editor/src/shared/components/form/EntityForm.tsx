import type { ReactNode } from "react";

export type EntityFieldType = "text" | "number" | "textarea";

export interface EntityFormField {
  name: string;
  label: string;
  type?: EntityFieldType;
  required?: boolean;
  placeholder?: string;
}

export interface EntityFormProps {
  fields: EntityFormField[];
  values: Record<string, string | number | undefined>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  children?: ReactNode;
}

export function EntityForm({
  fields,
  values,
  onChange,
  onSubmit,
  submitLabel = "Save",
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
        {fields.map((field) => (
          <label key={field.name} className="space-y-2">
            <span className="block text-xs font-medium text-slate-400">
              {field.label}
            </span>

            {field.type === "textarea" ? (
              <textarea
                value={values[field.name] ?? ""}
                onChange={(event) => onChange(field.name, event.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30"
              />
            ) : (
              <input
                type={field.type ?? "text"}
                value={values[field.name] ?? ""}
                onChange={(event) => onChange(field.name, event.target.value)}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-400/30"
              />
            )}
          </label>
        ))}
      </div>

      {children}

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}