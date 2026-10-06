import { useEffect, useMemo, useState } from "react";
import { EntityForm, type EntityFormValue } from "../../../shared/components";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import type { ClubRelationConfig } from "../config/clubEditorConfig";

function rowKey(row: EntityRow, keys: string[]) {
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, row[key]])));
}

function normalize(value: unknown, type?: string): Scalar {
  if (value === "" || value === undefined) return null;
  if (type === "number") { const n = Number(value); return Number.isFinite(n) ? n : null; }
  if (type === "boolean") return Boolean(value);
  return value as Scalar;
}

function belongsToClub(row: EntityRow, config: ClubRelationConfig, clubId: number) {
  if (config.scope.type === "either") return config.scope.fields.some(field => Number(row[field]) === clubId);
  return Number(row[config.scope.field]) === clubId;
}

export function ClubScopedRelationEditor({ clubId, config }: { clubId: number; config: ClubRelationConfig }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const result = await editorApi.entity.list(config.table, { page: 1, pageSize: 1000, orderBy: config.primaryKey[0] ?? "id", orderDirection: "ASC" });
      setRows(result.rows.filter(row => belongsToClub(row, config, clubId)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [clubId, config.id, config.table]);

  const fixedFields = useMemo(() => {
    if (config.scope.type === "either") return new Set(config.scope.fields);
    return new Set([config.scope.field]);
  }, [config.scope]);

  function openCreate() {
    const next = { ...(config.createDefaults ?? {}) } as Record<string, unknown>;
    if (config.scope.type === "either") next[config.scope.fields[0]] = clubId;
    else next[config.scope.field] = clubId;
    setEditing(null); setValues(next);
  }

  function openEdit(row: EntityRow) {
    setEditing(row);
    setValues(Object.fromEntries(config.fields.map(field => [field.name, row[field.name] ?? ""])));
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const payload: Record<string, Scalar> = {};
      for (const field of config.fields) payload[field.name] = normalize(values[field.name], field.type);
      if (config.scope.type !== "either") payload[config.scope.field] = clubId;
      else if (!editing) {
        if (config.normalizeCreate) Object.assign(payload, config.normalizeCreate(clubId, values));
        else {
          const [a, b] = config.scope.fields.map(field => Number(payload[field]));
          if (Number.isFinite(a) && Number.isFinite(b)) {
            payload[config.scope.fields[0]] = Math.min(a, b);
            payload[config.scope.fields[1]] = Math.max(a, b);
          }
        }
      }
      if (editing) await editorApi.entity.update(config.table, rowKey(editing, config.primaryKey), payload);
      else await editorApi.entity.create(config.table, payload);
      setEditing(null); setValues({}); await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  async function remove(row: EntityRow) {
    if (!window.confirm(`Delete ${config.title.toLowerCase()} record?`)) return;
    try { await editorApi.entity.remove(config.table, rowKey(row, config.primaryKey)); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="text-sm font-semibold text-white">{config.title}</h3><p className="mt-1 text-xs text-slate-600">{config.description}</p></div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add</button>
      </div>
      {error && <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</div>}
      {(editing || Object.keys(values).length > 0) && (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#10161d] p-4">
          <EntityForm
            fields={config.fields.map(field => ({ ...field, disabled: fixedFields.has(field.name) || field.disabled }))}
            values={values as Record<string, EntityFormValue>}
            onChange={(name, value) => setValues(current => ({ ...current, [name]: value }))}
            onSubmit={() => void save()}
            submitLabel={editing ? "Save changes" : "Create"}
            submitting={saving}
            error={null}
          />
          <div className="mt-3 flex justify-end"><button type="button" onClick={() => { setEditing(null); setValues({}); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Cancel</button></div>
        </div>
      )}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs"><thead><tr className="border-b border-white/10 text-slate-600">{config.columns.map(column => <th key={column.key} className="px-3 py-2 font-medium">{column.label}</th>)}<th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead>
        <tbody>{rows.map(row => <tr key={rowKey(row, config.primaryKey)} className="border-b border-white/5">{config.columns.map(column => <td key={column.key} className="px-3 py-3 text-slate-300">{row[column.key] == null || row[column.key] === "" ? "—" : String(row[column.key])}</td>)}<td className="px-3 py-3 text-right"><button type="button" onClick={() => openEdit(row)} className="mr-3 text-slate-400 hover:text-white">Edit</button><button type="button" onClick={() => void remove(row)} className="text-red-300 hover:text-red-200">Delete</button></td></tr>)}</tbody>
        </table>
        {loading && <div className="py-8 text-center text-xs text-slate-600">Loading...</div>}
        {!loading && rows.length === 0 && <div className="py-8 text-center text-xs text-slate-600">No records for this club.</div>}
      </div>
    </section>
  );
}