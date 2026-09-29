import { useState } from "react";

import {
  Tabs,
} from "../../../../../shared/components";

import {
  WorldEntityListPage,
} from "../../../components/WorldEntityListPage";

import type {
  DataTableColumn,
} from "../../../../../shared/components";

import {
  climateSeasons,
  climates,
} from "../../../data/world.data";

import type {
  Climate,
} from "../../../types";

import { ClimateSeasonList } from "../components/ClimateSeasonList";

export function ClimatesPage() {
  const [activeTab, setActiveTab] =
    useState<
      "climates" | "seasons"
    >("climates");

  const columns: DataTableColumn<Climate>[] =
    [
      {
        key: "name",
        header: "Climate",
        render: (row) => (
          <span className="font-medium text-white">
            {row.name}
          </span>
        ),
      },

      {
        key: "shortName",
        header: "Short Name",
        render: (row) =>
          row.shortName ?? "—",
      },

      {
        key: "seasons",
        header: "Seasons",
        render: (row) =>
          climateSeasons.filter(
            (season) =>
              season.climateId ===
              row.id,
          ).length,
      },
    ];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Climates
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Define climates and their seasonal profiles.
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "climates",
            label: "Climates",
            content: (
              <WorldEntityListPage
                title="Climates"
                description="Climate definitions used by the world geography."
                rows={climates}
                columns={columns}
              />
            ),
          },

          {
            id: "seasons",
            label: "Climate Seasons",
            content: (
              <div className="space-y-4">
                {climates.map(
                  (climate) => (
                    <ClimateSeasonList
                      key={climate.id}
                      climate={
                        climate
                      }
                      seasons={
                        climateSeasons
                      }
                    />
                  ),
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}