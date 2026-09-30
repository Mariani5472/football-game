import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  DataTable,
  EntityForm,
  DeleteDialog,
  EntityPicker,
  Pagination,
  SearchInput,
} from "..";
import type { DataTableColumn, EntityFormField, EntityFormValue } from "..";
import { useEntityMutation, useEntityQuery } from "../../hooks/useEntityApi";
import type { EntityRow } from "../../api/editorApi";

export interface CrudRelation {
  table: string;
  labelColumn?: string;
}

export interface CrudColumn {
  key: string;
  header: string;
  relation?: CrudRelation;
  render?: (row: EntityRow) => React.ReactNode;
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
  toPayload?: (values: Record<string, EntityFormValue>) => Record<string, string | number | boolean | null>;
  getRowId?: (row: EntityRow) => string | number;
  getRowName?: (row: EntityRow) => string;
}

function displayValue(row: EntityRow, column: CrudColumn) {
  const value = row[column.key];
  return value == null || value === "" ? "—" : String(value);
}

export function CrudEntityPage({ config }: { config: CrudEntityConfig }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EntityRow | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>(config.defaultValues ?? {});
  const [notice, setNotice] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      page,
      pageSize: 15,
      search,
      searchColumns: config.searchColumns,
      orderBy: config.columns[0]?.key ?? "id",
      orderDirection: "ASC" as const,
    }),
    [page, search, config.searchColumns, config.columns],
  );

  const list = useEntityQuery<EntityRow>(config.table, options);
  const mutation = useEntityMutation(config.table);

  useEffect(() => setPage(1), [search]);

  useEffect(() => {
    if (editing) setValues(config.toValues?.(editing) ?? editing);
    else if (creating) setValues(config.defaultValues ?? {});
  }, [editing, creating, config]);

  const columns: DataTableColumn<EntityRow>[] = config.columns.map((column) => ({
    key: column.key,
    header: column.header,
    render: column.render ?? ((row) => (
      <span className="font-medium text-white">{displayValue(row, column)}</span>
    )),
  }));

  async function save() {
    setNotice(null);
    try {
      const payload = config.toPayload
        ? config.toPayload(values)
        : Object.fromEntries(
            Object.entries(values)
              .filter(([key]) => key !== "id")
              .map(([key, value]) => [key, value ?? null]),
          );

      if (editing) {
        await mutation.update(config.getRowId?.(editing) ?? editing.id, payload);
        setNotice("Changes saved.");
      } else {
        await mutation.create(payload);
        setNotice("Entity created.");
      }

      setEditing(null);
      setCreating(false);
      await list.reload();
    } catch {
      // mutation.error is rendered by the form
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await mutation.remove(config.getRowId?.(deleting) ?? deleting.id);
      setDeleting(null);
      setNotice("Entity deleted.");
      await list.reload();
    } catch {
      // mutation.error is kept for visibility by the mutation hook
    }
  }

  const selectedName = deleting
    ? config.getRowName?.(deleting) ?? String(deleting.name ?? deleting.id)
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{config.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void list.reload()} className="rounded-lg border border-white/10 p-2.5 text-slate-400 hover:bg-white/[0.04]" aria-label="Reload">
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={() => { setEditing(null); setCreating(true); }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15">
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {creating || editing ? (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">{editing ? "EDIT" : "CREATE"}</div>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {editing
                  ? config.getRowName?.(editing) ?? String(editing.name ?? editing.id)
                  : "New " + config.title.replace(/s$/, "")}
              </h2>
            </div>
            <button type="button" onClick={() => { setEditing(null); setCreating(false); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
              Back
            </button>
          </div>

          <EntityForm
            fields={config.fields.filter((field) => !field.relation)}
            values={values}
            onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
            onSubmit={() => void save()}
            submitLabel={editing ? "Save changes" : "Create"}
            submitting={mutation.loading}
            error={mutation.error}
          />

          {config.fields.some((field) => field.relation) && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {config.fields.filter((field) => field.relation).map((field) => (
                <EntityPicker
                  key={field.name}
                  label={field.label}
                  table={field.relation!.table}
                  labelColumn={field.relation!.labelColumn ?? "name"}
                  value={values[field.name] == null ? "" : String(values[field.name])}
                  onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                  placeholder={"Select " + field.label.toLowerCase() + "..."}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder={"Search " + config.title.toLowerCase() + "..."} />
          <DataTable
            rows={list.rows}
            columns={columns}
            loading={list.loading}
            error={list.error}
            onEdit={setEditing}
            onDelete={setDeleting}
            emptyMessage={"No " + config.title.toLowerCase() + " found."}
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
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
