import { Pencil, Trash2 } from "lucide-react";
import type { DataTableProps } from "./types";

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  onEdit,
  onDelete,
  loading = false,
  error,
  emptyMessage = "No records found.",
  loadingMessage = "Loading...",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-slate-500">
        {loadingMessage}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-5 py-8 text-center">
        <div className="text-sm font-medium text-red-200">Could not load records</div>
        <div className="mt-2 text-xs leading-5 text-red-200/60">{error}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-white/10 bg-white/[0.02]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={[
                "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600",
                column.className ?? "",
              ].join(" ")}>
                {column.header}
              </th>
            ))}
            {hasActions && <th className="w-24 px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? "cursor-pointer transition hover:bg-white/[0.025]" : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-4 text-sm text-slate-300">
                  {column.render(row)}
                </td>
              ))}
              {hasActions && (
                <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-slate-200" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row)} className="rounded-lg p-2 text-slate-500 hover:bg-red-400/10 hover:text-red-200" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}