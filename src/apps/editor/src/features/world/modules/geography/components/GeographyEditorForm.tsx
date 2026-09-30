import { EntityForm, EntityPicker, type EntityFormValue } from "../../../../../shared/components";
import type { GeographySpec } from "../config/geographyConfig";
import type { GeographyTreeNode } from "../types";

interface Props { spec: GeographySpec; editing: GeographyTreeNode | null; creating: { kind: string; parent?: GeographyTreeNode } | null; values: Record<string, EntityFormValue>; saving: boolean; error: string | null; onChange: (name: string, value: EntityFormValue) => void; onSubmit: () => void; onCancel: () => void; }

export function GeographyEditorForm({ spec, editing, creating, values, saving, error, onChange, onSubmit, onCancel }: Props) {
  const scalarFields = spec.fields.filter(field => !field.relation);
  const relationFields = spec.fields.filter(field => field.relation);
  return <section className="rounded-2xl border border-white/10 bg-[#121820] p-6"><div className="mb-5 flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{editing ? "EDIT" : "CREATE"}</div><h2 className="mt-2 text-lg font-semibold text-white">{editing?.label ?? `New ${spec.label}`}</h2>{creating?.parent && <p className="mt-1 text-xs text-slate-500">Child of {creating.parent.label}</p>}</div><button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button></div><EntityForm fields={scalarFields.map(field => ({ name: field.name, label: field.label, type: field.type, required: field.required, min: field.min, max: field.max, step: field.step }))} values={values} onChange={onChange} onSubmit={onSubmit} submitLabel={editing ? "Save changes" : "Create"} submitting={saving} error={error}>{relationFields.map(field => <EntityPicker key={field.name} label={field.label} table={field.relation} value={values[field.name] == null ? "" : String(values[field.name])} onChange={value => onChange(field.name, value)} />)}</EntityForm></section>;
}
