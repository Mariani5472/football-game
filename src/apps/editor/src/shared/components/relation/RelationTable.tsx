import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { EntityRow, Scalar } from "../../api/editorApi";
import { DataTable } from "../data-table/DataTable";
import { MultiEntityPicker } from "./MultiEntityPicker";
import { PercentageEditor } from "./PercentageEditor";
import type { RelationDraft, RelationTableProps } from "./RelationTypes";

function labelFor(row: EntityRow, preferred?: string) {
  return String(row[preferred ?? "name"] ?? row.name ?? row.full_name ?? row.short_name ?? row.id ?? "—");
}

export function RelationTable({
  title, relation, owner, rows, targetRows, columns, loading = false, error, onSave,
  emptyMessage = "No relationships.",
}: RelationTableProps) {
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [draftValues, setDraftValues] = useState<Record<string, Record<string, Scalar>>>({});

  const existing = useMemo(
    () => new Set(rows.map(row => String(row[relation.targetColumn]))),
    [rows, relation.targetColumn],
  );

  const options = targetRows
    .filter(row => row.id != null && !existing.has(String(row.id)))
    .map(row => ({ id: row.id as number | string, label: labelFor(row, relation.targetLabelColumn) }));

  function rowKey(row: EntityRow) {
    return String(row[relation.targetColumn]);
  }

  function valueFor(row: EntityRow, column: string) {
    return draftValues[rowKey(row)]?.[column] ?? row[column];
  }

  function setValue(row: EntityRow, column: string, value: Scalar) {
    const key = rowKey(row);
    setDraftValues(current => ({ ...current, [key]: { ...current[key], [column]: value } }));
  }

  async function persist(extra: RelationDraft[] = []) {
    const existingDrafts: RelationDraft[] = rows.map(row => ({
      targetId: row[relation.targetColumn] as number | string,
      values: Object.fromEntries((relation.valueColumns ?? []).map(column => [
        column, draftValues[rowKey(row)]?.[column] ?? row[column] ?? null,
      ])),
    }));
    await onSave([...existingDrafts, ...extra]);
    setSelected([]);
    setDraftValues({});
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{rows.length} relationships</div>
        </div>
        <div className="min-w-[260px] flex-1 sm:max-w-xl">
          <MultiEntityPicker options={options} selected={selected} onChange={setSelected} placeholder="Add entities..." disabled={loading} />
        </div>
        {selected.length > 0 && (
          <button type="button" onClick={() => void persist(selected.map(targetId => ({ targetId, values: {} })))} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      <DataTable
        rows={rows}
        columns={[
          ...columns.map(column => ({
            key: column.key,
            header: column.header,
            render: (row: EntityRow) => {
              if (column.type === "percentage") {
                return <PercentageEditor value={Number(valueFor(row, column.key) ?? 0)} onChange={value => setValue(row, column.key, value)} />;
              }
              if (column.type === "weight" || column.type === "number") {
                return (
                  <input
                    type="number"
                    min={column.type === "weight" ? 0 : undefined}
                    step={column.type === "weight" ? "0.01" : "1"}
                    value={Number(valueFor(row, column.key) ?? 0)}
                    onChange={event => setValue(row, column.key, Number(event.target.value))}
                    className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white outline-none"
                  />
                );
              }
              if (column.type === "seed") {
                return (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={Number(valueFor(row, column.key) ?? 0)}
                    onChange={event => setValue(row, column.key, Number(event.target.value))}
                    className="w-20 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white outline-none"
                  />
                );
              }
              if (column.key === relation.targetColumn) {
                const target = targetRows.find(item => String(item.id) === String(row[column.key]));
                return labelFor(target ?? row, relation.targetLabelColumn);
              }
              return String(valueFor(row, column.key) ?? "—");
            },
          })),
          {
            key: "__remove",
            header: "",
            render: row => (
              <button type="button"
                onClick={() => void persist(rows.filter(candidate => rowKey(candidate) !== rowKey(row)).map(candidate => ({
                  targetId: candidate[relation.targetColumn] as number | string,
                  values: Object.fromEntries((relation.valueColumns ?? []).map(column => [column, candidate[column] ?? null])),
                })))}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-400/10 hover:text-red-200" aria-label="Remove relationship">
                <Trash2 size={14} />
              </button>
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        emptyMessage={emptyMessage}
      />

      {owner && <div className="text-[11px] text-slate-600">Changes are persisted through the relation editor.</div>}
    </section>
  );
}
