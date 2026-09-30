import { useMemo } from "react";
import type { ReactNode } from "react";
import { editorApi } from "../../api/editorApi";
import type { EntityRow } from "../../api/editorApi";
import { useEntityQuery } from "../../hooks/useEntityApi";
import { DataTable, EntityForm, DeleteDialog, EntityPicker, Pagination, SearchInput } from "..";
import type { DataTableColumn, EntityFormField, EntityFormValue } from "..";
import { useEffect, useState } from "react";

export interface CrudRelation {
  table: string;
  labelColumn?: string;
}

export interface CrudColumn {
  key: string;
  header: string;
  relation?: CrudRelation;
  render?: (row: EntityRow) => ReactNode;
}

export type CrudField = EntityFormField & { relation?: CrudRelation };

export interface CrudEntityConfig {
  table: string;
  title: string;
  description: string;
  searchColumns?: string[];
  columns: CrudColumn[];
  fields: CrudField[];
  defaultValues?: Record<string, EntityFormValue>;
  toValues?: (row: EntityRow) => Record<string, EntityFormValue>;
  toPayload?: (
    values: Record<string, EntityFormValue>,
  ) => Record<string, string | number | boolean | null>;
  getRowId?: (row: EntityRow) => string | number;
  getRowName?: (row: EntityRow) => string;
  pageSize?: number;
}

function normalizeValue(
  value: EntityFormValue,
  field: CrudField,
): string | number | boolean | null {
  if (value === undefined || value === "") return null;
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "boolean") return Boolean(value);
  return value;
}

function humanizeRelationColumn(column: CrudColumn) {
  return column.key.replace(/_id$/, "_name");
}

export function CrudEntityPage({ config }: { config: CrudEntityConfig }) {
  const pageSize = config.pageSize ?? 15;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EntityRow | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const options = useMemo(() => ({
    page,
    pageSize,
    search,
    searchColumns: config.searchColumns,
    orderBy: config.columns[0]?.key ?? "id",
    orderDirection: "ASC" as const,
  }), [page, pageSize, search, config.searchColumns, config.columns]);

  const list = useEntityQuery(config.table, options);
  const relationQueries = config.fields
    .filter(field => field.relation)
    .map(field => field.relation!.table);

  const relationTableKey = relationQueries.join("|");
  const uniqueRelationTables = [...new Set(relationQueries)];
  const relationData = uniqueRelationTables.map(table =>
    useEntityQuery(table, { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" })
  );

  const relationMaps = useMemo(() => {
    const maps = new Map<string, Map<string, string>>();
    uniqueRelationTables.forEach((table, index) => {
      const map = new Map<string, string>();
      for (const row of relationData[index].rows) {
        if (row.id != null) {
          map.set(String(row.id), String(row.name ?? row.full_name ?? row.short_name ?? row.id));
        }
      }
      maps.set(table, map);
    });
    return maps;
  }, [relationTableKey, ...relationData.map(item => item.rows)]);

  const relationsLoading = relationData.some(item => item.loading);
  const relationsError = relationData.find(item => item.error)?.error ?? null;

  useEffect(() => setPage(1), [search]);

  useEffect(() => {
    if (editing) {
      setValues(config.toValues?.(editing) ?? editing);
    } else if (creating) {
      setValues(config.defaultValues ?? {});
    }
  }, [editing, creating, config]);

  function renderColumn(row: EntityRow, column: CrudColumn) {
    if (column.render) return column.render(row);
    if (column.relation) {
      const value = row[column.key];
      if (value == null || value === "") return "—";
      return relationMaps.get(column.relation.table)?.get(String(value)) ?? String(value);
    }
    const value = row[column.key];
    return value == null || value === "" ? "—" : String(value);
  }

  const columns: DataTableColumn<EntityRow>[] = config.columns.map(column => ({
    key: column.key,
    header: column.header,
    render: row => (
      <span className="font-medium text-white">{renderColumn(row, column)}</span>
    ),
  }));

  function openCreate() {
    setEditing(null);
    setNotice(null);
    setMutationError(null);
    setCreating(true);
  }

  function openEdit(row: EntityRow) {
    setCreating(false);
    setNotice(null);
    setMutationError(null);
    setEditing(row);
  }

  async function save() {
    setMutationLoading(true);
    setMutationError(null);
    setNotice(null);

    try {
      const payload = config.toPayload
        ? config.toPayload(values)
        : Object.fromEntries(
            config.fields
              .map(field => [field.name, normalizeValue(values[field.name], field)]),
          );

      const saved = editing
        ? await editorApi.update(config.table, config.getRowId?.(editing) ?? editing.id, payload)
        : await editorApi.create(config.table, payload);

      void saved;
      setEditing(null);
      setCreating(false);
      setNotice(editing ? "Changes saved." : "Entity created.");
      await list.reload();
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setMutationLoading(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setMutationLoading(true);
    setMutationError(null);

    try {
      await editorApi.remove(config.table, config.getRowId?.(deleting) ?? deleting.id);
      setDeleting(null);
      setNotice("Entity deleted.");
      await list.reload();
    } catch (cause) {
      setMutationError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setMutationLoading(false);
    }
  }

  const selectedName = deleting
    ? config.getRowName?.(deleting) ??
      String(deleting.name ?? deleting.full_name ?? deleting.id)
    : "";

  const scalarFields = config.fields.filter(field => !field.relation);
  const relationFields = config.fields.filter(field => field.relation);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{config.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{config.description}</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15">
          + New
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      )}

      {creating || editing ? (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">{editing ? "EDIT" : "CREATE"}</div>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {editing
                  ? config.getRowName?.(editing) ?? String(editing.name ?? editing.full_name ?? editing.id)
                  : `New ${config.title.replace(/s$/, "")}`}
              </h2>
            </div>
            <button type="button" onClick={() => { if (!mutationLoading) { setEditing(null); setCreating(false); } }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
              Back
            </button>
          </div>

          <EntityForm
            fields={scalarFields}
            values={values}
            onChange={(name, value) => setValues(current => ({ ...current, [name]: value }))}
            onSubmit={() => void save()}
            submitLabel={editing ? "Save changes" : "Create"}
            submitting={mutationLoading}
            error={mutationError}
          >
            {relationFields.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {relationFields.map(field => {
                  const table = field.relation!.table;
                  return (
                    <EntityPicker
                      key={field.name}
                      label={field.label}
                      table={table}
                      labelColumn={field.relation!.labelColumn ?? "name"}
                      value={values[field.name] == null ? "" : String(values[field.name])}
                      onChange={value => setValues(current => ({
                        ...current,
                        [field.name]: value === "" ? null : value,
                      }))}
                      placeholder={`Select ${field.label.toLowerCase()}...`}
                    />
                  );
                })}
              </div>
            )}
          </EntityForm>
        </div>
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${config.title.toLowerCase()}...`} />
          <DataTable
            rows={list.rows}
            columns={columns}
            loading={list.loading || relationsLoading}
            error={list.error ?? relationsError}
            onEdit={openEdit}
            onDelete={row => { setMutationError(null); setDeleting(row); }}
            emptyMessage={`No ${config.title.toLowerCase()} found.`}
          />
          {!list.loading && !list.error && (
            <Pagination page={list.page} pageCount={list.pageCount} onPageChange={setPage} />
          )}
        </>
      )}

      <DeleteDialog
        open={Boolean(deleting)}
        entityName={selectedName}
        onConfirm={() => void remove()}
        onClose={() => { if (!mutationLoading) setDeleting(null); }}
      />

      {mutationError && deleting && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{mutationError}</div>
      )}
    </div>
  );
}
