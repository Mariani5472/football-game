import { useState } from "react";
import { DataTable, EntityPicker, Tabs, type DataTableColumn } from "../../../../../shared/components";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyTree } from "../components/GeographyTree";
import { useGeography } from "../hooks/useGeography";

export function GeographyPage() {
  const { tree, selection, selectNode, loading, error } = useGeography();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const cityColumns: DataTableColumn<EntityRow>[] = [
    { key: "name", header: "City", render: row => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
    { key: "nation_id", header: "Country", render: row => String(row.nation_name ?? row.nation_id ?? "—") },
    { key: "nation_region_id", header: "Region", render: row => String(row.nation_region_name ?? row.nation_region_id ?? "—") },
  ];

  const cityNodes = tree.flatMap(continent =>
    (continent.children ?? []).flatMap(country =>
      (country.children ?? []).flatMap(region => region.children ?? []),
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Geography</h1>
        <p className="mt-2 text-sm text-slate-500">Build the world hierarchy from world.db through the editor API.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <GeographyBreadcrumb selection={selection} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <GeographyTree
          nodes={tree}
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
              <EntityPicker
                label="Continent"
                value={selection.continent?.id ?? ""}
                table="continent"
                onChange={value => {
                  const node = tree.find(item => item.entityId === Number(value));
                  if (node) selectNode(node);
                }}
              />
              <EntityPicker
                label="Country"
                value={selection.country?.id ?? ""}
                table="nation"
                onChange={value => {
                  const node = tree.flatMap(item => item.children ?? []).find(item => item.entityId === Number(value));
                  if (node) selectNode(node);
                }}
              />
              <EntityPicker
                label="Region"
                value={selection.region?.id ?? ""}
                table="nation_region"
                onChange={value => {
                  const node = tree
                    .flatMap(item => item.children ?? [])
                    .flatMap(item => item.children ?? [])
                    .find(item => item.entityId === Number(value));
                  if (node) selectNode(node);
                }}
              />
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
                  rows={cityNodes.map(node => ({
                    id: node.entityId,
                    name: node.label,
                  }))}
                  loading={loading}
                  error={error}
                  onRowClick={row => {
                    const node = cityNodes.find(item => item.entityId === Number(row.id));
                    if (node) {
                      setSelectedNodeId(node.id);
                      selectNode(node);
                    }
                  }}
                  emptyMessage="No cities found."
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
        </div>
      </div>
    </div>
  );
}
