import { ChevronDown, ChevronUp } from "lucide-react";
import type { EntityRow } from "../../api/editorApi";

interface OrderedRelationEditorProps {
  rows: EntityRow[];
  orderColumn?: string;
  renderLabel?: (row: EntityRow) => string;
  onMove: (row: EntityRow, direction: "up" | "down") => void;
}

export function OrderedRelationEditor({
  rows,
  orderColumn = "sort_order",
  renderLabel,
  onMove,
}: OrderedRelationEditorProps) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={String(row.id ?? index + "-" + row[orderColumn])} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-3">
            <span className="w-6 text-center text-xs text-slate-600">{Number(row[orderColumn] ?? index + 1)}</span>
            <span className="text-xs text-slate-300">{renderLabel?.(row) ?? String(row.name ?? row.id ?? "—")}</span>
          </div>
          <div className="flex gap-1">
            <button type="button" disabled={index === 0} onClick={() => onMove(row, "up")} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.04] disabled:opacity-30">
              <ChevronUp size={14} />
            </button>
            <button type="button" disabled={index === rows.length - 1} onClick={() => onMove(row, "down")} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.04]">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
