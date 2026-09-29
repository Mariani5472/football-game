import type { DataTableProps } from "./types";

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-white/10 bg-white/[0.02]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600",
                  column.className ?? "",
                ].join(" ")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={
                onRowClick
                  ? "cursor-pointer transition hover:bg-white/[0.025]"
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} className="px-5 py-4 text-sm text-slate-300">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}