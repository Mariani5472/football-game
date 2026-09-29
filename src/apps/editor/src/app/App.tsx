import { useState } from "react";

import { EditorLayout } from "../shared/layout/EditorLayout";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import type { EditorRoute } from "./routes";

export default function App() {
  const [route, setRoute] =
    useState<EditorRoute>("dashboard");

  return (
    <EditorLayout
      activeRoute={route}
      onNavigate={setRoute}
    >
      <DashboardPage />
    </EditorLayout>
  );
}
