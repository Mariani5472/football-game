import type { GeographyTreeNode } from "../types";
import { MapPinned, Plus } from "lucide-react";

export function GeographyRegionList({
  regions,
  onSelect,
  onAdd,
}: {
  regions: GeographyTreeNode[];
  onSelect: (node: GeographyTreeNode) => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">Regions</h3>
          <p className="mt-1 text-xs text-slate-600">
            Administrative areas belonging to this country.
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300"
        >
          <Plus size={13} />
          Add Region
        </button>
      </div>

      {!regions.length ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-600">
          No regions yet.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {regions.map(region => (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelect(region)}
              className="rounded-xl border border-white/10 bg-white/[0.015] px-4 py-3 text-left hover:border-emerald-400/20"
            >
              <div className="flex items-center gap-2">
                <MapPinned size={14} className="text-slate-600" />
                <span className="font-medium text-white">{region.label}</span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {countCities(region)} cities
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function countCities(node: GeographyTreeNode): number {
  return node.children.reduce(
    (total, child) =>
      total +
      (child.kind === "city" ? 1 : 0) +
      countCities(child),
    0,
  );
}
