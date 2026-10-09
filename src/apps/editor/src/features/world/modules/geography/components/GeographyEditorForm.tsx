import { EntityForm, EntityPicker, type EntityFormValue } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { GeographySpec } from "../config/geographyConfig";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

interface Props {
  spec: GeographySpec;
  editing: GeographyTreeNode | null;
  creating: { kind: GeographyEntityKind; parent?: GeographyTreeNode } | null;
  values: Record<string, EntityFormValue>;
  saving: boolean;
  error: string | null;
  onChange: (name: string, value: EntityFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function GeographyEditorForm({
  spec,
  editing,
  creating,
  values,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const relationFields = spec.fields.filter(field => field.relation);
  const scalarFields = spec.fields.filter(field => !field.relation);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#121820] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            {editing ? "Edit" : "Create"}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {editing?.label ?? `New ${spec.label}`}
          </h2>
          {creating?.parent && (
            <p className="mt-1 text-xs text-slate-500">
              Child of {creating.parent.label}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <EntityForm
        fields={scalarFields}
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel={editing ? "Save changes" : "Create"}
        submitting={saving}
        error={error}
      >
        <div className="grid gap-5 md:grid-cols-2">
          {relationFields.map(field => (
            <RelationField
              key={field.name}
              name={field.name}
              label={field.label}
              table={field.relation!}
              value={values[field.name]}
              parent={creating?.parent}
              onChange={value => onChange(field.name, value)}
            />
          ))}
        </div>
      </EntityForm>
    </section>
  );
}

function RelationField({
  name,
  label,
  table,
  value,
  parent,
  onChange,
}: {
  name: string;
  label: string;
  table: string;
  value: EntityFormValue;
  parent?: GeographyTreeNode;
  onChange: (value: number | string) => void;
}) {
  const source = useEntityQuery(table, {
    page: 1,
    pageSize: 1000,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const filtered = source.rows.filter(row => {
    if (!parent) return true;

    if (name === "continent_id" && parent.kind === "continent") {
      return Number(row.id) === parent.entityId;
    }

    if (name === "continent_region_id") {
      if (parent.kind === "continent-region") return Number(row.id) === parent.entityId;
      if (parent.kind === "country") return Number(row.id) === Number(parent.row.continent_region_id);
    }

    if (name === "nation_id") {
      if (parent.kind === "country") return Number(row.id) === parent.entityId;
      if (parent.kind === "nation-region") return Number(row.id) === Number(parent.row.nation_id);
      if (parent.kind === "city") return Number(row.id) === Number(parent.row.nation_id);
    }

    if (name === "nation_region_id") {
      if (parent.kind === "nation-region") return Number(row.id) === parent.entityId;
      if (parent.kind === "city") return Number(row.id) === Number(parent.row.nation_region_id);
    }

    return true;
  });

  return (
    <EntityPicker
      label={label}
      value={value == null ? "" : String(value)}
      options={filtered.map(row => ({
        id: row.id as number | string,
        label: String(row.name ?? row.short_name ?? row.id),
      }))}
      onChange={onChange}
      placeholder={`Select ${label.toLowerCase()}...`}
      loading={source.loading}
      error={source.error}
      disabled={Boolean(parent && [
        "continent_id",
        "continent_region_id",
        "nation_id",
        "nation_region_id",
      ].includes(name))}
    />
  );
}
