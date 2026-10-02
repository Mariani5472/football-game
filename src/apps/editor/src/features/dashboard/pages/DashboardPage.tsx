import { useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { RecentEntities } from "../components/RecentEntities";
import { QuickActions } from "../components/QuickActions";
import { ValidationSummary } from "../components/ValidationSummary";
import { WorldMetrics } from "../components/WorldMetrics";
import { useDashboard } from "../hooks/useDashboard";
import { QuickCreateModal } from "../../quick-create";

export function DashboardPage() {
  const { data } = useDashboard();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  return (
    <div className="space-y-8">
      <DashboardHeader world={data.world} />

      <WorldMetrics counts={data.counts} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <QuickActions onAction={action => { if (action === "create") setQuickCreateOpen(true); }} />

        <ValidationSummary
          warnings={data.world.warnings}
          errors={data.world.errors}
        />
      </div>

      <RecentEntities
        entities={data.recentEntities}
      />
    </div>
      <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />
    </div>
  );
}