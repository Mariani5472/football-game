import type { EntityRow, Scalar } from "../../api/editorApi";

interface WeightedRelationEditorProps {
  rows: EntityRow[];
  targetColumn: string;
  weightColumn?: string;
  targetLabelColumn?: string;
  onChange: (row: EntityRow, values: Record<string, Scalar>) => void;
}

export function WeightedRelationEditor({
  rows,
  targetColumn,
  weightColumn = "weight",
  targetLabelColumn = "name",
  onChange,
}: WeightedRelationEditorProps) {
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={String(row.id ?? row[targetColumn])} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <span className="text-xs text-slate-300">
            {String(row[targetLabelColumn] ?? row.name ?? row.short_name ?? row[targetColumn] ?? "—")}
          </span>
          <input type="number" min={0} step="0.01" value={Number(row[weightColumn] ?? 1)}
            onChange={event => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onChange(row, { [weightColumn]: next });
            }}
            className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white outline-none" />
        </div>
      ))}
    </div>
  );
}
