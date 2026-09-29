import { useState } from "react";

import {
  EntityPicker,
  Tabs,
} from "../../../../../shared/components";

import {
  cities,
  continents,
  countries,
  nationRegions,
  regions,
} from "../../../data/world.data";

import type {
  DataTableColumn,
} from "../../../../../shared/components";

import { DataTable } from "../../../../../shared/components";

import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyTree } from "../components/GeographyTree";

import { useGeography } from "../hooks/useGeography";

export function GeographyPage() {
  const {
    tree,
    selection,
    selectNode,
  } = useGeography();

  const [selectedNodeId, setSelectedNodeId] =
    useState<string>();

  const cityColumns: DataTableColumn<
    (typeof cities)[number]
  >[] = [
    {
      key: "name",
      header: "City",
      render: (row) => (
        <span className="font-medium text-white">
          {row.name}
        </span>
      ),
    },
    {
      key: "country",
      header: "Country",
      render: (row) =>
        countries.find(
          (country) =>
            country.id === row.countryId,
        )?.name ?? "—",
    },
    {
      key: "region",
      header: "Region",
      render: (row) =>
        regions.find(
          (region) =>
            region.id === row.regionId,
        )?.name ?? "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Geography
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Build the world hierarchy from continent to city.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
        <GeographyBreadcrumb
          selection={selection}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <GeographyTree
          nodes={tree}
          selectedId={selectedNodeId}
          onSelect={(node) => {
            setSelectedNodeId(node.id);
            selectNode(node);
          }}
        />

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              HIERARCHY
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <EntityPicker
                label="Continent"
                value={
                  selection.continent?.id ?? ""
                }
                options={continents.map(
                  (item) => ({
                    id: item.id,
                    label: item.name,
                  }),
                )}
                onChange={() => undefined}
              />

              <EntityPicker
                label="Country"
                value={
                  selection.country?.id ?? ""
                }
                options={countries.map(
                  (item) => ({
                    id: item.id,
                    label: item.name,
                  }),
                )}
                onChange={() => undefined}
              />

              <EntityPicker
                label="Region"
                value={
                  selection.region?.id ?? ""
                }
                options={regions.map(
                  (item) => ({
                    id: item.id,
                    label: item.name,
                  }),
                )}
                onChange={() => undefined}
              />
            </div>
          </div>

          <Tabs
            activeTab="cities"
            onChange={() => undefined}
            items={[
              {
                id: "cities",
                label: "Cities",
                content: (
                  <DataTable
                    columns={cityColumns}
                    rows={cities}
                    onRowClick={() => undefined}
                  />
                ),
              },
            ]}
          />

          {selection.city && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                SELECTED CITY
              </div>

              <div className="mt-3 text-lg font-semibold text-white">
                {selection.city.name}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {selection.country?.name}
                {" · "}
                {selection.region?.name}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
              NATION REGIONS
            </div>

            <div className="mt-4 space-y-2">
              {nationRegions.map(
                (region) => (
                  <div
                    key={region.id}
                    className="rounded-xl border border-white/5 bg-black/10 px-4 py-3"
                  >
                    <div className="text-sm font-medium text-slate-200">
                      {region.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      {countries.find(
                        (country) =>
                          country.id ===
                          region.countryId,
                      )?.name}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}