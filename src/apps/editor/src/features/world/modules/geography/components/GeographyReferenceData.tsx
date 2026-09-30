import type { EntityRow } from "../../../../../shared/api/editorApi";
import { DataTable, EntityForm, EntityPicker, type DataTableColumn, type EntityFormValue } from "../../../../../shared/components";

export interface ReferenceConfig {
  title: string;
  fields: Array<{ name: string; label: string; type?: "text" | "number" | "boolean"; required?: boolean; relation?: string }>;
  columns: DataTableColumn<EntityRow>[];
}

interface Props {
  table: string;
  config: ReferenceConfig;
  state: { rows: EntityRow[]; loading: boolean; error: string | null };
  mode: "list" | "create" | "edit";
  editing: EntityRow | null;
  values: Record<string, EntityFormValue>;
  saving: boolean;
  error: string | null;
  options: Array<[string, string]>;
  onTableChange: (table: string) => void;
  onCreate: () => void;
  onEdit: (row: EntityRow) => void;
  onSave: () => void;
  onChange: (name: string, value: EntityFormValue) => void;
}

export function GeographyReferenceData({
  table, config, state, mode, editing, values, saving, error, options,
  onTableChange, onCreate, onEdit, onSave, onChange,
}: Props) {
  const scalarFields = config.fields.filter(field => !field.relation);
  const relationFields = config.fields.filter(field => field.relation);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">REFERENCE DATA</div>
          <h3 className="mt-1 text-base font-semibold text-white">{config.title}</h3>
        </div>
        <div className="flex gap-2">
          <select value={table} onChange={event => onTableChange(event.target.value)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200">
            {options.map(([key, title]) => <option key={key} value={key} className="bg-[#121820]">{title}</option>)}
          </select>
          <button type="button" onClick={onCreate} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">New</button>
        </div>
      </div>

      {mode === "list" ? (
        <div className="mt-4">
          <DataTable rows={state.rows} columns={config.columns} onEdit={onEdit} loading={state.loading} error={state.error} emptyMessage={`No ${config.title.toLowerCase()} found.`} />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#121820] p-5">
          <EntityForm fields={scalarFields} values={values} onChange={onChange} onSubmit={onSave} submitting={saving} error={error} submitLabel={mode === "edit" ? "Save changes" : "Create"}>
            {relationFields.map(field => (
              <EntityPicker key={field.name} label={field.label} table={field.relation} value={values[field.name] == null ? "" : String(values[field.name])} onChange={value => onChange(field.name, value)} />
            ))}
          </EntityForm>
        </div>
      )}
    </section>
  );
}
