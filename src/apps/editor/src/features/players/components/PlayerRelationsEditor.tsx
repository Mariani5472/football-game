import { useEffect, useMemo, useState } from "react";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import { EntityPicker } from "../../../shared/components";
import type { PlayerRelationConfig } from "../config/playerConfig";

function keyOf(row: EntityRow, keys: string[]) {
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, row[key]])));
}

function normalize(value: unknown, field: { type?: string }): Scalar {
  if (value === "" || value === undefined) return null;
  if (field.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "boolean") return Boolean(value);
  return value as Scalar;
}

export function PlayerRelationsEditor({ playerId, config }: { playerId: number; config: PlayerRelationConfig }) {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const result = config.loadRows
        ? await config.loadRows(playerId)
        : (await editorApi.list(config.table, { page: 1, pageSize: 1000 })).rows;
      setRows(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, [playerId, config.id]);

  function openCreate() {
    const next: Record<string, unknown> = { ...(config.defaults ?? {}) };
    if (config.playerField) next[config.playerField] = playerId;
    else if (config.table !== "player_contract_clause") next.player_id = playerId;
    setEditing(null);
    setValues(next);
  }

  function openEdit(row: EntityRow) {
    setEditing(row);
    setValues(Object.fromEntries(config.fields.map(field => [field.name, row[field.name] ?? ""])));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, Scalar> = {};
      for (const field of config.fields) payload[field.name] = normalize(values[field.name], field);
      if (editing) {
        await editorApi.update(config.table, keyOf(editing, config.primaryKey), payload);
      } else {
        if (config.playerField) payload[config.playerField] = playerId;
        else if (config.table !== "player_contract_clause") payload.player_id = playerId;
        await editorApi.create(config.table, payload);
      }
      setEditing(null);
      setValues({});
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: EntityRow) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await editorApi.remove(config.table, keyOf(row, config.primaryKey));
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const display = (value: unknown) => value == null || value === "" ? "—" : String(value);

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{config.title}</h3>
          <p className="mt-1 text-xs text-slate-600">{rows.length} record(s)</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ Add</button>
      </div>

      {error && <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</div>}

      {(editing || config.id === "clauses" || Object.keys(values).length > 0) && (
        <div className="rounded-xl border border-white/10 bg-[#10161d] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {config.fields.map(field => {
              const value = values[field.name] ?? "";
              if (field.relation) {
                return (
                  <EntityPicker
                    key={field.name}
                    label={field.label}
                    table={field.relation.table}
                    labelColumn={field.relation.labelColumn ?? "name"}
                    value={value == null ? "" : String(value)}
                    onChange={next => setValues(current => ({ ...current, [field.name]: next }))}
                  />
                );
              }
              if (field.type === "boolean") {
                return (
                  <label key={field.name} className="flex items-center gap-2 pt-7 text-sm text-slate-300">
                    <input type="checkbox" checked={Boolean(value)} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.checked }))} />
                    {field.label}
                  </label>
                );
              }
              return (
                <label key={field.name} className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-400">{field.label}</span>
                  <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value == null ? "" : String(value)} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" />
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(null); setValues({}); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">{saving ? "Saving..." : editing ? "Save" : "Create"}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-white/10 text-slate-600">{config.columns.map(column => <th key={column.key} className="px-3 py-2 font-medium">{column.label}</th>)}<th className="px-3 py-2 text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map(row => (
              <tr key={keyOf(row, config.primaryKey)} className="border-b border-white/5">
                {config.columns.map(column => <td key={column.key} className="px-3 py-3 text-slate-300">{display(row[column.key])}</td>)}
                <td className="px-3 py-3 text-right">
                  <button type="button" onClick={() => openEdit(row)} className="mr-3 text-slate-400 hover:text-white">Edit</button>
                  <button type="button" onClick={() => void remove(row)} className="text-red-300 hover:text-red-200">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <div className="py-8 text-center text-xs text-slate-600">No records.</div>}
        {loading && <div className="py-8 text-center text-xs text-slate-600">Loading...</div>}
      </div>
    </section>
  );
}
