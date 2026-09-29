import { useState } from "react";

import { DashboardPage } from "../features/dashboard/pages";
import { TeamsPage } from "../features/teams/pages";
import {
  CitiesPage,
  ClimatesPage,
  ContinentsPage,
  CountriesPage,
  LanguagesPage,
  RegionsPage,
} from "../features/world/pages";
import { EditorLayout } from "../shared/layout/EditorLayout";
import type { EditorRoute } from "./routes";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
      <h1 className="text-xl font-semibold text-white">
        {title}
      </h1>
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
    case "clubs":
      return <TeamsPage />;
    case "stadiums":
      return <ComingSoon title="Stadiums" />;
    case "competitions":
      return <ComingSoon title="Competitions" />;
    case "fast-start":
      return <ComingSoon title="Fast Start" />;
    case "validation":
      return <ComingSoon title="Validation" />;
    case "export":
      return <ComingSoon title="Export" />;
  }
}

export default function App() {
  const [route, setRoute] = useState<EditorRoute>("dashboard");

  return (
    <EditorLayout
      activeRoute={route}
      onNavigate={setRoute}
    >
      {renderRoute(route)}
    </EditorLayout>
  );
}