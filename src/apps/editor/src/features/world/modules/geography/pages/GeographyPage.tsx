import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import {
  DataTable,
  DeleteDialog,
  EntityForm,
  EntityPicker,
  type DataTableColumn,
  type EntityFormValue,
} from "../../../../../shared/components";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyTree } from "../components/GeographyTree";
import { useGeography } from "../hooks/useGeography";
import type { GeographyTreeNode, GeographyEntityKind } from "../types";

interface GeographyField {
  name: string;
  label: string;
  type?: "text" | "number" | "boolean";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  relation?: string;
}

interface GeographySpec {
  table: string;
  label: string;
  fields: GeographyField[];
}

const specs: Record<GeographyEntityKind, GeographySpec> = {
  federation: {
    table: "federation",
    label: "Federation",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "regional_strength", label: "Regional Strength", type: "number", min: 0 },
      { name: "primary_color", label: "Primary Color" },
      { name: "secondary_color", label: "Secondary Color" },
      { name: "tertiary_color", label: "Tertiary Color" },
    ],
  },
  continent: {
    table: "continent",
    label: "Continent",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "continental_name", label: "Continental Name" },
      { name: "federation_id", label: "Federation", relation: "federation" },
    ],
  },
  "continent-region": {
    table: "continent_region",
    label: "Continent Region",
    fields: [
      { name: "continent_id", label: "Continent", relation: "continent", required: true },
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
    ],
  },
  country: {
    table: "nation",
    label: "Country",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "continent_region_id", label: "Continent Region", relation: "continent_region", required: true },
      { name: "currency_id", label: "Currency", relation: "currency" },
      { name: "national_stadium_id", label: "National Stadium", type: "number", min: 1 },
      { name: "economic_factor", label: "Economic Factor", type: "number", step: "0.01" },
      { name: "years_to_naturalization", label: "Years to Naturalization", type: "number", min: 0 },
      { name: "nationality_method_id", label: "Nationality Method", relation: "nationality_method" },
      { name: "development_state_id", label: "Development State", relation: "nation_development_state" },
    ],
  },
  "nation-region": {
    table: "nation_region",
    label: "Nation Region",
    fields: [
      { name: "nation_id", label: "Country", relation: "nation", required: true },
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
      { name: "population", label: "Population", type: "number", min: 0 },
    ],
  },
  city: {
    table: "city",
    label: "City",
    fields: [
      { name: "nation_id", label: "Country", relation: "nation", required: true },
      { name: "nation_region_id", label: "Nation Region", relation: "nation_region" },
      { name: "name", label: "Name", required: true },
      { name: "attraction", label: "Attraction", type: "number", min: 0 },
      { name: "population", label: "Population", type: "number", min: 0 },
      { name: "latitude", label: "Latitude", type: "number", step: "0.000001", min: -90, max: 90 },
      { name: "longitude", label: "Longitude", type: "number", step: "0.000001", min: -180, max: 180 },
      { name: "altitude", label: "Altitude", type: "number" },
      { name: "climate_id", label: "Climate", relation: "climate" },
    ],
  },
};

const childKind: Partial<Record<GeographyEntityKind, GeographyEntityKind>> = {
  federation: "continent",
  continent: "continent-region",
  "continent-region": "country",
  country: "nation-region",
  "nation-region": "city",
};

const typeLabels: Array<[string, GeographyEntityKind | "all"]> = [
  ["All", "all"],
  ["Federations", "federation"],
  ["Continents", "continent"],
  ["Continent Regions", "continent-region"],
  ["Countries", "country"],
  ["Nation Regions", "nation-region"],
  ["Cities", "city"],
];

function normalizeValue(value: EntityFormValue, field: GeographyField) {
  if (value === "" || value === undefined) return null;
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "boolean") return Boolean(value);
  return value;
}

function initialValues(spec: GeographySpec, parent?: GeographyTreeNode) {
  const values: Record<string, EntityFormValue> = {};
  for (const field of spec.fields) values[field.name] = null;

  if (!parent) return values;

  switch (spec.table) {
    case "continent":
      values.federation_id = parent.entityId;
      break;
    case "continent_region":
      values.continent_id = parent.entityId;
      break;
    case "nation":
      values.continent_region_id = parent.entityId;
      break;
    case "nation_region":
      values.nation_id = parent.entityId;
      break;
    case "city":
      values.nation_id = parent.row.nation_id ?? null;
      values.nation_region_id = parent.entityId;
      break;
  }

  return values;
}

export function GeographyPage() {
  const geography = useGeography();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<GeographyTreeNode | null>(null);
  const [creating, setCreating] = useState<{ kind: GeographyEntityKind; parent?: GeographyTreeNode } | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GeographyTreeNode | null>(null);

  const allRows = useMemo(() => {
    const rows: GeographyTreeNode[] = [];
    const walk = (node: GeographyTreeNode) => {
      rows.push(node);
      node.children.forEach(walk);
    };
    geography.tree.forEach(walk);
    return rows;
  }, [geography.tree]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allRows.filter(node => {
      const matchesType = filter === "all" || node.kind === filter;
      const matchesSearch =
        !search ||
        node.label.toLowerCase().includes(search) ||
        String(node.row.short_name ?? "").toLowerCase().includes(search);
      return matchesType && matchesSearch;
    });
  }, [allRows, filter, query]);

  const selectedNode = geography.selectedNode;
  const formKind = editing?.kind ?? creating?.kind;
  const formSpec = formKind ? specs[formKind] : null;

  const languageRelationTable =
    selectedNode?.kind === "country"
      ? "nation_language"
      : selectedNode?.kind === "nation-region"
        ? "nation_region_language"
        : selectedNode?.kind === "city"
          ? "city_language"
          : null;

  const relationOwnerColumn =
    selectedNode?.kind === "country"
      ? "nation_id"
      : selectedNode?.kind === "nation-region"
        ? "nation_region_id"
        : "city_id";

  const relationQuery = useEntityQuery(
    languageRelationTable ?? "nation_language",
    {
      page: 1,
      pageSize: 100,
      orderBy: "id",
      orderDirection: "ASC",
    },
  );

  const languagesQuery = useEntityQuery("language", {
    page: 1,
    pageSize: 100,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const climatesQuery = useEntityQuery("climate", {
    page: 1,
    pageSize: 100,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const relationRows = useMemo(
    () =>
      relationQuery.rows.filter(
        row => Number(row[relationOwnerColumn]) === Number(selectedNode?.entityId),
      ),
    [relationQuery.rows, relationOwnerColumn, selectedNode?.entityId],
  );

  useEffect(() => {
    if (editing) {
      setValues(Object.fromEntries(
        formSpec?.fields.map(field => [field.name, editing.row[field.name]]) ?? [],
      ));
    } else if (creating && formSpec) {
      setValues(initialValues(formSpec, creating.parent));
    }
  }, [editing, creating, formSpec]);

  useEffect(() => {
    setActionError(null);
  }, [selectedNode?.id]);

  async function saveEntity() {
    if (!formSpec) return;

    setSaving(true);
    setActionError(null);

    try {
      const payload = Object.fromEntries(
        formSpec.fields.map(field => [field.name, normalizeValue(values[field.name], field)]),
      );

      if (editing) {
        await editorApi.update(formSpec.table, editing.entityId, payload);
        setNotice(`${formSpec.label} updated.`);
      } else {
        const created = await editorApi.create(formSpec.table, payload);
        setNotice(`${formSpec.label} created (#${String(created.id)}).`);
      }

      setEditing(null);
      setCreating(null);
      await geography.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntity() {
    if (!deleting) return;

    setSaving(true);
    setActionError(null);

    try {
      await editorApi.remove(deleting.table, deleting.entityId);
      setDeleting(null);
      setNotice(`${deleting.label} deleted.`);
      await geography.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function addLanguage() {
    if (!selectedNode || !languageRelationTable) return;

    const available = languagesQuery.rows.find(language =>
      !relationRows.some(row => Number(row.language_id) === Number(language.id)),
    );

    if (!available) return;

    try {
      await editorApi.create(languageRelationTable, {
        [relationOwnerColumn]: selectedNode.entityId,
        language_id: available.id,
        percentage: 0,
      });
      setNotice(`Added ${String(available.name)}.`);
      await relationQuery.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function updateLanguage(row: EntityRow, percentage: number) {
    try {
      await editorApi.update(languageRelationTable!, row.id as number, {
        percentage,
      });
      await relationQuery.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function removeLanguage(row: EntityRow) {
    try {
      await editorApi.remove(languageRelationTable!, row.id as number);
      setNotice("Language removed.");
      await relationQuery.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const relationRowsWithNames = relationRows.map(row => ({
    ...row,
    language_name:
      languagesQuery.rows.find(language => Number(language.id) === Number(row.language_id))?.name ??
      row.language_id,
  }));

  const countFor = (kind: GeographyEntityKind) =>
    allRows.filter(node => node.kind === kind).length;

  const columns = useMemo<DataTableColumn<GeographyTreeNode>[]>(() => [
    {
      key: "name",
      header: "Name",
      render: row => <span className="font-medium text-white">{row.label}</span>,
    },
    {
      key: "short_name",
      header: "Short",
      render: row => String(row.row.short_name ?? "—"),
    },
    {
      key: "kind",
      header: "Type",
      render: row => String(row.kind),
    },
    {
      key: "children",
      header: "Children",
      render: row => String(row.children.length),
    },
  ], []);

  function startEdit(node: GeographyTreeNode) {
    setEditing(node);
    setCreating(null);
    setActionError(null);
    setNotice(null);
  }

  function startCreate(kind: GeographyEntityKind, parent?: GeographyTreeNode) {
    setCreating({ kind, parent });
    setEditing(null);
    setActionError(null);
    setNotice(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Geography</h1>
          <p className="mt-2 text-sm text-slate-500">
            Federation → Continent → Continent Region → Country → Nation Region → City
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void geography.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.04]"
          >
            <RefreshCw size={14} /> Reload
          </button>
          <button
            type="button"
            onClick={() => startCreate("federation")}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
          >
            <Plus size={14} /> New Federation
          </button>
        </div>
      </header>

      {notice && (
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([
          ["Federations", "federation"],
          ["Continents", "continent"],
          ["Continent Regions", "continent-region"],
          ["Countries", "country"],
          ["Nation Regions", "nation-region"],
          ["Cities", "city"],
        ] as const).map(([label, kind]) => (
          <button
            key={kind}
            type="button"
            onClick={() => setFilter(kind)}
            className={[
              "rounded-xl border px-4 py-3 text-left transition",
              filter === kind
                ? "border-emerald-400/20 bg-emerald-400/5"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]",
            ].join(" ")}
          >
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-600">{label}</div>
            <div className="mt-1 text-xl font-semibold text-white">{countFor(kind)}</div>
          </button>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search geography..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {typeLabels.map(([label, type]) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={[
                  "rounded-lg px-2.5 py-1.5 text-xs",
                  filter === type
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "text-slate-500 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <GeographyTree
            nodes={geography.tree}
            selectedId={geography.selectedId}
            onSelect={node => geography.setSelectedId(node.id)}
            search={query}
          />
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <GeographyBreadcrumb selection={geography.selection} />
          </div>

          {geography.error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
              {geography.error}
            </div>
          )}

          {selectedNode ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {formSpec?.label ?? selectedNode.kind}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">{selectedNode.label}</h2>
                  <p className="mt-1 text-xs text-slate-600">ID {selectedNode.entityId}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(selectedNode)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
                  >
                    Edit
                  </button>
                  {childKind[selectedNode.kind] && (
                    <button
                      type="button"
                      onClick={() => startCreate(childKind[selectedNode.kind]!, selectedNode)}
                      className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-400/15"
                    >
                      Add child
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleting(selectedNode)}
                    className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/5"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Children</div>
                  <div className="mt-1 text-sm text-slate-200">{selectedNode.children.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Type</div>
                  <div className="mt-1 text-sm text-slate-200">{selectedNode.kind}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">ID</div>
                  <div className="mt-1 text-sm text-slate-200">{selectedNode.entityId}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Visible results</div>
                  <div className="mt-1 text-sm text-slate-200">{filteredRows.length}</div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              Select a geography node to edit it.
            </section>
          )}

          {formSpec && (editing || creating) && (
            <section className="rounded-2xl border border-white/10 bg-[#121820] p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {editing ? "EDIT" : "CREATE"}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    {editing?.label ?? `New ${formSpec.label}`}
                  </h2>
                  {creating?.parent && (
                    <p className="mt-1 text-xs text-slate-500">Child of {creating.parent.label}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      setEditing(null);
                      setCreating(null);
                    }
                  }}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400"
                >
                  Back
                </button>
              </div>

              <EntityForm
                fields={formSpec.fields.filter(field => !field.relation).map(field => ({
                  name: field.name,
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  min: field.min,
                  max: field.max,
                  step: field.step,
                }))}
                values={values}
                onChange={(name, value) => setValues(current => ({ ...current, [name]: value }))}
                onSubmit={() => void saveEntity()}
                submitLabel={editing ? "Save changes" : "Create"}
                submitting={saving}
                error={actionError}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  {formSpec.fields.filter(field => field.relation).map(field => (
                    <EntityPicker
                      key={field.name}
                      label={field.label}
                      table={field.relation}
                      value={values[field.name] == null ? "" : String(values[field.name])}
                      onChange={value => setValues(current => ({
                        ...current,
                        [field.name]: value === "" ? null : value,
                      }))}
                    />
                  ))}
                </div>
              </EntityForm>
            </section>
          )}

          {selectedNode?.kind === "country" ||
          selectedNode?.kind === "nation-region" ||
          selectedNode?.kind === "city" ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">LANGUAGES</div>
                  <h3 className="mt-1 text-base font-semibold text-white">Language percentages</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void addLanguage()}
                  disabled={languagesQuery.loading}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"
                >
                  Add language
                </button>
              </div>

              <div className="mt-4">
                <DataTable
                  rows={relationRowsWithNames as EntityRow[]}
                  columns={[
                    {
                      key: "language_id",
                      header: "Language",
                      render: row => String(row.language_name ?? row.language_id ?? "—"),
                    },
                    {
                      key: "percentage",
                      header: "Percentage",
                      render: row => (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={String(row.percentage ?? 0)}
                          onChange={event => {
                            const percentage = Number(event.target.value);
                            const index = relationQuery.rows.findIndex(item => Number(item.id) === Number(row.id));
                            if (index >= 0) {
                              const next = [...relationQuery.rows];
                              next[index] = { ...next[index], percentage };
                            }
                          }}
                          onBlur={event => void updateLanguage(row, Number(event.target.value))}
                          className="w-28 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white"
                        />
                      ),
                    },
                    {
                      key: "actions",
                      header: "",
                      render: row => (
                        <button
                          type="button"
                          onClick={() => void removeLanguage(row)}
                          className="text-xs text-red-300"
                        >
                          Remove
                        </button>
                      ),
                    },
                  ]}
                  loading={relationQuery.loading || languagesQuery.loading}
                  error={relationQuery.error ?? languagesQuery.error}
                  emptyMessage="No language relationships."
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">RECORDS</div>
                <h3 className="mt-1 text-base font-semibold text-white">Filtered geography</h3>
              </div>
              <span className="text-xs text-slate-600">{filteredRows.length} records</span>
            </div>
            <DataTable
              rows={filteredRows}
              columns={columns}
              loading={geography.loading}
              error={geography.error}
              onRowClick={node => geography.setSelectedId(node.id)}
              onEdit={startEdit}
              onDelete={setDeleting}
              emptyMessage="No geography records found."
            />
          </section>

          {selectedNode?.kind === "city" && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">CLIMATE</div>
                <h3 className="mt-1 text-base font-semibold text-white">City climate</h3>
              </div>

              <EntityPicker
                label="Climate"
                table="climate"
                value={String(selectedNode.row.climate_id ?? "")}
                onChange={async value => {
                  try {
                    await editorApi.update("city", selectedNode.entityId, {
                      climate_id: value === "" ? null : Number(value),
                    });
                    setNotice("City climate updated.");
                    await geography.reload();
                  } catch (cause) {
                    setActionError(cause instanceof Error ? cause.message : String(cause));
                  }
                }}
                loading={climatesQuery.loading}
                error={climatesQuery.error}
              />
            </section>
          )}
        </div>
      </div>

      <DeleteDialog
        open={Boolean(deleting)}
        entityName={String(deleting?.label ?? "")}
        onConfirm={() => void deleteEntity()}
        onClose={() => {
          if (!saving) setDeleting(null);
        }}
      />
    </div>
  );
}
