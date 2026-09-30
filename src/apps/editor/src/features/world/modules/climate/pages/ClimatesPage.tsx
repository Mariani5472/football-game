import { useState } from "react";
import { CrudEntityPage, DataTable, Tabs } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";

export function ClimatesPage() {
  const [activeTab, setActiveTab] = useState<"climates" | "seasons">("climates");
  const climates = useEntityQuery("climate", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const seasons = useEntityQuery("climate_season", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });

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
            content: (
              <SeasonList rows={seasons.rows} loading={seasons.loading} error={seasons.error} />
            ),
          },
        ]}
      />
    </div>
  );
}

function SeasonList({
  rows,
  loading,
  error,
}: {
  rows: EntityRow[];
  loading: boolean;
  error: string | null;
}) {
  const climateQuery = useEntityQuery("climate", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const climateMap = new Map(climateQuery.rows.map(row => [String(row.id), String(row.name ?? row.id)]));

  const grouped = new Map<string, EntityRow[]>();
  for (const row of rows) {
    const key = String(row.climate_id ?? "");
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  if (loading || climateQuery.loading) return <div className="text-sm text-slate-500">Loading seasons...</div>;
  if (error || climateQuery.error) return <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error ?? climateQuery.error}</div>;

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([climateId, climateRows]) => (
        <div key={climateId} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-medium text-white">{climateMap.get(climateId) ?? `Climate #${climateId}`}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {climateRows.map(row => (
              <div key={String(row.id)} className="rounded-xl border border-white/5 bg-black/10 px-4 py-3">
                <div className="text-sm text-slate-300">{String(row.name ?? row.id)}</div>
                <div className="mt-1 text-xs text-slate-600">Season {String(row.id)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
