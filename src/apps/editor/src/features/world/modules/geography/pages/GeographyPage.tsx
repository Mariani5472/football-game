import { useMemo, useState } from "react";
import { EntityPicker, Tabs, DataTable, type DataTableColumn } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyTree } from "../components/GeographyTree";
import { useGeography } from "../hooks/useGeography";

export function GeographyPage() {
  const { tree, selection, selectNode } = useGeography();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const continents = useEntityQuery("continent", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const countries = useEntityQuery("nation", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const regions = useEntityQuery("nation_region", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const cities = useEntityQuery("city", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });

  const cityColumns = useMemo<DataTableColumn<EntityRow>[]>(() => [
    { key: "name", header: "City", render: row => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
    { key: "nation_id", header: "Country", render: row => String(row.nation_name ?? row.nation_id ?? "—") },
    { key: "nation_region_id", header: "Region", render: row => String(row.nation_region_name ?? row.nation_region_id ?? "—") },
  ], []);

  const cityRows = useMemo(() => {
    const countryMap = new Map(countries.rows.map(row => [String(row.id), String(row.name ?? row.id)]));
    const regionMap = new Map(regions.rows.map(row => [String(row.id), String(row.name ?? row.id)]));
    return cities.rows.map(row => ({
      ...row,
      nation_name: countryMap.get(String(row.nation_id)) ?? row.nation_id,
      nation_region_name: regionMap.get(String(row.nation_region_id)) ?? row.nation_region_id,
    }));
  }, [cities.rows, countries.rows, regions.rows]);

  const canUseTree = !continents.error && !countries.error && !regions.error && !cities.error;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Geography</h1>
        <p className="mt-2 text-sm text-slate-500">Browse the world hierarchy directly from world.db.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <GeographyBreadcrumb selection={selection} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <GeographyTree
          nodes={canUseTree ? tree : []}
          selectedId={selectedNodeId}
          onSelect={node => {
            setSelectedNodeId(node.id);
            selectNode(node);
          }}
        />

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">HIERARCHY</div>
            <div className="grid gap-4 md:grid-cols-3">
              <EntityPicker label="Continent" value={selection.continent?.id ?? ""} table="continent" onChange={value => {
                const row = continents.rows.find(item => String(item.id) === String(value));
                if (row) selectNode({ id: `continent-${row.id}`, label: String(row.name), kind: "continent", entityId: Number(row.id) });
              }} />
              <EntityPicker label="Country" value={selection.country?.id ?? ""} table="nation" onChange={value => {
                const row = countries.rows.find(item => String(item.id) === String(value));
                if (row) selectNode({ id: `country-${row.id}`, label: String(row.name), kind: "country", entityId: Number(row.id) });
              }} />
              <EntityPicker label="Region" value={selection.region?.id ?? ""} table="nation_region" onChange={value => {
                const row = regions.rows.find(item => String(item.id) === String(value));
                if (row) selectNode({ id: `region-${row.id}`, label: String(row.name), kind: "region", entityId: Number(row.id) });
              }} />
            </div>
          </div>

          <Tabs
            activeTab="cities"
            onChange={() => undefined}
            items={[{
              id: "cities",
              label: "Cities",
              content: (
                <DataTable
                  columns={cityColumns}
                  rows={cityRows}
                  loading={cities.loading || countries.loading || regions.loading}
                  error={cities.error ?? countries.error ?? regions.error}
                  onRowClick={row => {
                    const id = Number(row.id);
                    const source = cities.rows.find(item => Number(item.id) === id);
                    if (source) selectNode({ id: `city-${id}`, label: String(source.name), kind: "city", entityId: id });
                  }}
                />
              ),
            }]}
          />

          {selection.city && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-600">SELECTED CITY</div>
              <div className="mt-3 text-lg font-semibold text-white">{selection.city.name}</div>
              <div className="mt-1 text-sm text-slate-500">{selection.country?.name} · {selection.region?.name}</div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-600">NATION REGIONS</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {regions.loading ? (
                <div className="text-sm text-slate-500">Loading regions...</div>
              ) : regions.error ? (
                <div className="text-sm text-red-300">{regions.error}</div>
              ) : (
                regions.rows.map(region => (
                  <button key={String(region.id)} type="button" onClick={() => selectNode({ id: `region-${region.id}`, label: String(region.name), kind: "region", entityId: Number(region.id) })} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-left hover:bg-white/[0.03]">
                    <div className="text-sm font-medium text-slate-200">{String(region.name ?? region.id)}</div>
                    <div className="mt-1 text-xs text-slate-600">{String(region.nation_name ?? region.nation_id ?? "—")}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
