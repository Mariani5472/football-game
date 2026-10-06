import { useState } from "react";
import { domainApi } from "../../../shared/api/domainApi";
import { CrudEntityPage, Tabs } from "../../../shared/components";
import {
  alternativeStadiumConfig,
  stadiumChangeConfig,
  stadiumConfig,
} from "../config/stadiumConfig";

export function StadiumsPage() {
  const [tab, setTab] = useState("stadiums");

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD DB
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Stadiums
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Complete stadium editor covering identity, ownership, capacities,
          pitch, dimensions, condition, dates, location, environment and
          venue history.
        </p>
      </header>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "stadiums",
            label: "Stadiums",
            content: <CrudEntityPage config={{ ...stadiumConfig, duplicate: true, duplicateEntity: row => domainApi.duplicateStadium(Number(row.id)) }} />,
          },
          {
            id: "changes",
            label: "Stadium Changes",
            content: <CrudEntityPage config={stadiumChangeConfig} />,
          },
          {
            id: "alternatives",
            label: "Alternative Stadiums",
            content: <CrudEntityPage config={alternativeStadiumConfig} />,
          },
        ]}
      />
    </div>
  );
}
