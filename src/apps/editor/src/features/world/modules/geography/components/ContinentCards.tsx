import { Building2, ChevronRight, Globe2, Map as MapIcon, UsersRound } from "lucide-react";
import type { GeographyTreeNode } from "../types";

export function ContinentCards({
  continents,
  loading,
  onSelect,
}: {
  continents: GeographyTreeNode[];
  loading: boolean;
  onSelect: (node: GeographyTreeNode) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]"
          />
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-200">
          <Globe2 size={19} />
        </div>
        <div>
          <h2 className="font-semibold text-white">Continents</h2>
          <p className="text-xs text-slate-600">
            {continents.length} geographic roots
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {continents.map(node => (
          <ContinentCard key={node.id} node={node} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function ContinentCard({
  node,
  onSelect,
}: {
  node: GeographyTreeNode;
  onSelect: (node: GeographyTreeNode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className="group rounded-2xl border border-white/10 bg-white/[0.015] p-5 text-left transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl">
            {continentEmoji(node.label)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">
              {node.label}
            </div>
            <div className="text-xs text-slate-600">
              {node.row.short_name ?? "World region"}
            </div>
          </div>
        </div>

        <ChevronRight
          size={17}
          className="text-slate-700 transition group-hover:text-emerald-200"
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Countries" value={countKind(node, "country")} icon={<UsersRound size={13} />} />
        <Stat label="Regions" value={countKind(node, "nation-region")} icon={<MapIcon size={13} />} />
        <Stat label="Cities" value={countKind(node, "city")} icon={<Building2 size={13} />} />
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
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

function continentEmoji(name: string): string {
  const normalized = name.toLowerCase();

  if (normalized.includes("africa")) return "🌍";
  if (normalized.includes("asia")) return "🌏";
  if (normalized.includes("europe")) return "🌍";
  if (normalized.includes("america")) return "🌎";
  if (normalized.includes("oceania")) return "🌊";

  return "🌐";
}
