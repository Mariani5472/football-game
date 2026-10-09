import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

interface Props {
  node: GeographyTreeNode;
  formLabel?: string;
  childKind?: GeographyEntityKind;
  onBack?: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function GeographyEntityHeader({
  node,
  formLabel,
  childKind,
  onBack,
  onEdit,
  onAddChild,
  onDelete,
  onDuplicate,
}: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-white/10 p-2 text-slate-500 hover:bg-white/[0.04] hover:text-white"
                aria-label="Back"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {formLabel ?? node.kind}
            </span>
          </div>

          <h2 className="truncate text-2xl font-semibold tracking-tight text-white">
            {node.label}
          </h2>
          {node.row.short_name && (
            <p className="mt-1 text-sm text-slate-500">{node.row.short_name}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
          >
            <Pencil size={13} /> Edit
          </button>

          {childKind && (
            <button
              type="button"
              onClick={onAddChild}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/15"
            >
              <Plus size={13} /> Add {childLabel(childKind)}
            </button>
          )}

          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
            >
              Duplicate
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/5"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </section>
  );
}

function childLabel(kind: GeographyEntityKind): string {
  switch (kind) {
    case "continent":
      return "continent";
    case "continent-region":
      return "region";
    case "country":
      return "country";
    case "nation-region":
      return "region";
    case "city":
      return "city";
  }
}
