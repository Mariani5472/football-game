import { useState } from "react";

import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
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

    default:
      return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h1 className="text-xl font-semibold text-white">
            Coming soon
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This editor section is reserved for the next domain module.
          </p>
        </div>
      );
  }
}

export default function App() {
  const [route, setRoute] =
    useState<EditorRoute>("dashboard");

  return (
    <EditorLayout
      activeRoute={route}
      onNavigate={setRoute}
    >
      {renderRoute(route)}
    </EditorLayout>
  );
}