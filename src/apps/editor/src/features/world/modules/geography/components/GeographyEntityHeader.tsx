import type { GeographyEntityKind, GeographyTreeNode } from "../types";

interface Props { node: GeographyTreeNode; formLabel?: string; childKind?: GeographyEntityKind; onEdit: () => void; onAddChild: () => void; onDelete: () => void; }

export function GeographyEntityHeader({ node, formLabel, childKind, onEdit, onAddChild, onDelete }: Props) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{formLabel ?? node.kind}</div><h2 className="mt-2 text-xl font-semibold text-white">{node.label}</h2><p className="mt-1 text-xs text-slate-600">ID {node.entityId}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onEdit} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Edit</button>{childKind && <button type="button" onClick={onAddChild} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">Add child</button>}<button type="button" onClick={onDelete} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200">Delete</button></div></div></section>;
}
