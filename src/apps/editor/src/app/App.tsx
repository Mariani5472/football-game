import { useState } from "react";

import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { EditorLayout } from "../shared/layout/EditorLayout";
import type { EditorRoute } from "./routes";

export default function App() {
  const [route, setRoute] =
    useState<EditorRoute>("dashboard");

  return (
    <EditorLayout
      activeRoute={route}
      onNavigate={setRoute}
    >
      {route === "dashboard" && <DashboardPage />}
    </EditorLayout>
  );
}