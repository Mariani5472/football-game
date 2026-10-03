import { ChevronRight } from "lucide-react";
import type { GeographyTreeNode } from "../types";

export function CountryCards({
  countries,
  onSelect,
}: {
  countries: GeographyTreeNode[];
  onSelect: (node: GeographyTreeNode) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {countries.map(country => (
          <button
            key={country.id}
            type="button"
            onClick={() => onSelect(country)}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.015] px-4 py-4 text-left transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.03]"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-white">
                {country.label}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {countKind(country, "nation-region")} regions · {countKind(country, "city")} cities
              </div>
            </div>
            <ChevronRight size={16} className="shrink-0 text-slate-700" />
          </button>
        ))}
      </div>

      {!countries.length && (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-600">
          No countries found.
        </div>
      )}
    </section>
  );
}

function countKind(
  node: GeographyTreeNode,
  kind: GeographyTreeNode["kind"],
): number {
  return node.children.reduce(
    (total, child) =>
      total +
      (child.kind === kind ? 1 : 0) +
      countKind(child, kind),
    0,
  );
}
