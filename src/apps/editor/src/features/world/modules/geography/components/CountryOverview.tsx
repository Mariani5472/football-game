import { Plus, Upload } from "lucide-react";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode } from "../types";

export function CountryOverview({
  country,
  relationRows,
  onAddRegion,
  onImport,
}: {
  country: GeographyTreeNode;
  relationRows: EntityRow[];
  onAddRegion: () => void;
  onImport: () => void;
}) {
  const regionCount = countKind(country, "nation-region");
  const cityCount = countKind(country, "city");
  const languageCount = relationRows.filter(row => row.language_id != null).length;
  const climateCount = countCountryClimates(country);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Regions" value={regionCount} />
        <Metric label="Cities" value={cityCount} />
        <Metric label="Languages" value={languageCount || "—"} />
        <Metric label="Climate zones" value={climateCount} />
        <Metric label="Confederation" value="From world package" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
        >
          <Upload size={13} />
          Import CSV
        </button>

        <button
          type="button"
          onClick={onAddRegion}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200"
        >
          <Plus size={13} />
          Add Region
        </button>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
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

function countCountryClimates(country: GeographyTreeNode): number {
  const climateIds = new Set<number>();

  function visit(node: GeographyTreeNode) {
    if (node.kind === "city" && node.row.climate_id != null) {
      climateIds.add(Number(node.row.climate_id));
    }
    node.children.forEach(visit);
  }

  visit(country);
  return climateIds.size;
}
