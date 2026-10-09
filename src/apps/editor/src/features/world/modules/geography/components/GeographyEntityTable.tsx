import { Edit3, MapPin, Plus, Trash2 } from "lucide-react";
import type { GeographyTreeNode } from "../types";
import type { GeographySpec } from "../config/geographyConfig";

export interface GeographyTableColumn {
  key: string;
  header: string;
  relation?: string;
  render?: (node: GeographyTreeNode) => string;
}

interface Props {
  nodes: GeographyTreeNode[];
  spec: GeographySpec;
  columns?: GeographyTableColumn[];
  relationLabels: Record<string, Map<string, string>>;
  onSelect: (node: GeographyTreeNode) => void;
  onEdit: (node: GeographyTreeNode) => void;
  onDelete: (node: GeographyTreeNode) => void;
  onAdd: () => void;
}

export function GeographyEntityTable({
  nodes,
  spec,
  columns,
  relationLabels,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const visibleColumns = columns ?? spec.columns;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {spec.pluralLabel}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {nodes.length} records in the current view
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          <Plus size={13} />
          New {spec.label}
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <MapPin size={20} className="mx-auto text-slate-700" />
          <p className="mt-3 text-sm text-slate-500">
            No {spec.pluralLabel.toLowerCase()} found.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
          >
            Create the first one
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="border-b border-white/10 bg-white/[0.02]">
              <tr>
                {visibleColumns.map(column => (
                  <th
                    key={column.key}
                    className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600"
                  >
                    {column.header}
                  </th>
                ))}
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {nodes.map(node => (
                <tr
                  key={node.id}
                  className="transition hover:bg-white/[0.025]"
                >
                  {visibleColumns.map(column => {
                    const raw = node.row[column.key];
                    const value = column.render
                      ? column.render(node)
                      : column.relation
                        ? relationLabels[column.relation]?.get(
                            String(raw ?? ""),
                          ) ?? (raw == null || raw === "" ? "—" : String(raw))
                        : raw == null || raw === ""
                          ? "—"
                          : String(raw);

                    return (
                      <td
                        key={column.key}
                        className="px-5 py-4 text-sm text-slate-300"
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(node)}
                          className="text-left hover:text-white"
                        >
                          {value}
                        </button>
                      </td>
                    );
                  })}

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(node)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"
                        aria-label={`Edit ${node.label}`}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(node)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-400/10 hover:text-red-200"
                        aria-label={`Delete ${node.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
