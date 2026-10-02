import { useEffect, useState } from "react";

import { FormationsPage } from "../features/formations/pages";
import { ReferenceDataPage } from "../features/reference-data/pages/ReferenceDataPage";
import { CompetitionsPage } from "../features/competitions/pages";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { PeoplePage } from "../features/people/pages";
import { PlayersPage } from "../features/players/pages";
import { TeamsPage } from "../features/teams/pages";
import { TemplatesPage } from "../features/templates/pages/TemplatesPage";
import { WorldSystemsPage } from "../features/world-systems/pages/WorldSystemsPage";
import { ValidationPage } from "../features/validation/pages/ValidationPage";
import { ExportPage } from "../features/export/pages/ExportPage";
import { StadiumsPage } from "../features/stadiums/pages";
import {
  CitiesPage,
  ClimatesPage,
  ContinentsPage,
  CountriesPage,
  GeographyPage,
  LanguagesPage,
  RegionsPage,
} from "../features/world/pages";
import { EditorLayout } from "../shared/layout/EditorLayout";
import type { EditorRoute } from "./routes";
import { QuickCreateModal } from "../features/quick-create";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        This editor section is reserved for a later domain module.
      </p>
    </div>
  );
}

function renderRoute(route: EditorRoute) {
  switch (route) {
    case "dashboard":
      return <DashboardPage />;
    case "geography":
      return <GeographyPage />;
    case "reference-data":
      return <ReferenceDataPage />;
    case "continents":
      return <ContinentsPage />;
    case "countries":
      return <CountriesPage />;
    case "regions":
      return <RegionsPage />;
    case "cities":
      return <CitiesPage />;
    case "languages":
      return <LanguagesPage />;
    case "climates":
      return <ClimatesPage />;
    case "people":
      return <PeoplePage />;
    case "players":
      return <PlayersPage />;
    case "clubs":
      return <TeamsPage />;
    case "stadiums":
      return <StadiumsPage />;
    case "formations":
      return <FormationsPage />;
    case "competitions":
      return <CompetitionsPage />;
    case "templates":
      return <TemplatesPage />;
    case "world-systems":
      return <WorldSystemsPage />;
    case "validation":
      return <ValidationPage />;
    case "fast-start":
      return <ComingSoon title="Fast Start" />;
    case "fast-create":
      return <ComingSoon title="Quick Create" />;
    case "export":
      return <ExportPage />;
  }
}

export default function App() {
  const [route, setRoute] = useState<EditorRoute>("dashboard");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  useEffect(() => {
    const handleEntityNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ table?: string; id?: string | number }>).detail;
      const routeByTable: Record<string, EditorRoute> = {
        team: "clubs",
        club: "clubs",
        stadium: "stadiums",
        person: "people",
        player: "players",
        competition: "competitions",
        competition_season: "competitions",
        competition_stage: "competitions",
        formation: "formations",
        nation: "countries",
        city: "cities",
      };
      const next = detail.table ? routeByTable[detail.table] : undefined;
      if (next) setRoute(next);

      if (detail.table && detail.id != null) {
        const key = `${detail.table}:${detail.id}`;
        const stored = JSON.parse(localStorage.getItem("football-editor-recent") ?? "[]") as string[];
        localStorage.setItem(
          "football-editor-recent",
          JSON.stringify([key, ...stored.filter(item => item !== key)].slice(0, 12)),
        );
      }
    };

    window.addEventListener("editor:navigate-entity", handleEntityNavigation);
    return () => window.removeEventListener("editor:navigate-entity", handleEntityNavigation);
  }, []);


  return (
    <EditorLayout
      activeRoute={route}
      onNavigate={nextRoute => {
        setRoute(nextRoute);
        if (nextRoute === "fast-create") setQuickCreateOpen(true);
      }}
    >
      {renderRoute(route)}
      <QuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
      />
    </EditorLayout>
  );
}
