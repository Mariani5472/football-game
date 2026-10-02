import { useState } from "react";
import { CrudEntityPage, DataTable, Tabs } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";

export function ClimatesPage() {
  const [activeTab, setActiveTab] = useState<"climates" | "seasons">("climates");

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Climates</h1>
        <p className="mt-2 text-sm text-slate-500">Define climates and their seasonal profiles from world.db.</p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "climates",
            label: "Climates",
            content: (
              <CrudEntityPage config={{
                table: "climate",
                title: "Climates",
                description: "Manage climate definitions.",
                searchColumns: ["name", "short_name"],
                columns: [
                  { key: "name", header: "Climate" },
                  { key: "short_name", header: "Short Name" },
                ],
                fields: [
                  { name: "name", label: "Name", required: true },
                  { name: "short_name", label: "Short Name" },
                ],
              }} />
            ),
          },
          {
            id: "seasons",
            label: "Climate Seasons",
            content: <ClimateSeasonList />,
          },
        ]}
      />
    </div>
  );
}

function ClimateSeasonList() {
  const seasons = useEntityQuery("climate_season_profile", {
    page: 1,
    pageSize: 100,
    orderBy: "id",
    orderDirection: "ASC",
  });

  const climates = useEntityQuery("climate", {
    page: 1,
    pageSize: 100,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const climateMap = new Map(
    climates.rows.map(row => [
      String(row.id),
      String(row.name ?? row.id),
    ]),
  );

  const rows = seasons.rows.map(row => ({
    ...row,
    climate_name: climateMap.get(String(row.climate_id)) ?? row.climate_id,
  }));

  if (seasons.loading || climates.loading) {
    return <div className="text-sm text-slate-500">Loading climate seasons...</div>;
  }

  if (seasons.error || climates.error) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
        {seasons.error ?? climates.error}
      </div>
    );
  }

  return (
    <DataTable
      rows={rows as EntityRow[]}
      columns={[
        {
          key: "climate_id",
          header: "Climate",
          render: row => String(row.climate_name ?? "—"),
        },
        {
          key: "season",
          header: "Season",
          render: row => String(row.season ?? row.season_id ?? "—"),
        },
        {
          key: "average_temperature",
          header: "Avg. Temperature",
          render: row => String(row.average_temperature ?? "—"),
        },
      ]}
      emptyMessage="No climate season profiles found."
    />
  );
}
