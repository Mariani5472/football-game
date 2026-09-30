import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { DataTable, EntityPicker } from "../../../../../shared/components";
import type { EntityRow } from "../../../../../shared/api/editorApi";

export interface RelationshipEditorProps {
  title: string;
  rows: EntityRow[];
  targetRows: EntityRow[];
  targetColumn: string;
  targetLabel: string;
  loading: boolean;
  error?: string | null;
  onAdd: (targetId: number) => void;
  onChange: (row: EntityRow, targetId: number) => void;
  onRemove: (row: EntityRow) => void;
  percentage?: boolean;
  onPercentageChange?: (row: EntityRow, value: number) => void;
}

export function RelationshipEditor({
  title,
  rows,
  targetRows,
  targetColumn,
  targetLabel,
  loading,
  error,
  onAdd,
  onChange,
  onRemove,
  percentage,
  onPercentageChange,
}: RelationshipEditorProps) {
  const labels = new Map(
    targetRows.map(row => [String(row.id), String(row.name ?? row.short_name ?? row.id)]),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <EntityPicker
          label=""
          value=""
          options={targetRows
            .filter(target => !rows.some(row => Number(row[targetColumn]) === Number(target.id)))
            .map(target => ({ id: target.id as number, label: String(target.name ?? target.short_name ?? target.id) }))}
          onChange={value => onAdd(Number(value))}
          placeholder={`Add ${targetLabel.toLowerCase()}...`}
          loading={loading}
        />
      </div>
      <div className="mt-4">
        <DataTable
          rows={rows}
          columns={[
            {
              key: targetColumn,
              header: targetLabel,
              render: row => labels.get(String(row[targetColumn])) ?? String(row[targetColumn] ?? "—"),
            },
            ...(percentage
              ? [{
                  key: "percentage",
                  header: "%",
                  render: (row: EntityRow) => (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      defaultValue={String(row.percentage ?? 0)}
                      onBlur={event => onPercentageChange?.(row, Number(event.target.value))}
                      className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white"
                    />
                  ),
                }]
              : []),
            {
              key: "actions",
              header: "",
              render: row => (
                <div className="flex gap-3">
                  <button type="button" onClick={() => onRemove(row)} className="text-xs text-red-300">
                    Remove
                  </button>
                </div>
              ),
            },
          ]}
          loading={loading}
          error={error}
          emptyMessage="No relationships."
        />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <Plus size={12} />
        Changes are persisted through the editor API.
      </div>
    </section>
  );
}

export function InlineRelationField({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}
