import { useMemo, useState } from "react";
import { HeartPulse, History, Users } from "lucide-react";
import { Tabs } from "../../../shared/components";
import { playerRelationConfigs, playerRelationGroups } from "../config/playerConfig";
import { PlayerRelationsEditor } from "./PlayerRelationsEditor";

export function PlayerRelationTabs({ playerId }: { playerId?: number }) {
  const [tab, setTab] = useState("history");

  const configMap = useMemo(
    () => new Map(playerRelationConfigs.map(config => [config.id, config])),
    [],
  );

  if (!playerId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">
        Save the player first to manage related records.
      </div>
    );
  }

  return (
    <Tabs
      activeTab={tab}
      onChange={setTab}
      items={[
        {
          id: "history",
          label: "Career & Records",
          icon: History,
          content: (
            <div className="space-y-5">
              {playerRelationGroups.slice(0, 3).map(group => (
                <section key={group.id} className="space-y-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {group.label}
                  </div>
                  {group.relationIds.map(id => {
                    const relation = configMap.get(id);
                    return relation ? (
                      <PlayerRelationsEditor key={id} playerId={playerId} config={relation} />
                    ) : null;
                  })}
                </section>
              ))}
            </div>
          ),
        },
        {
          id: "health",
          label: "Health",
          icon: HeartPulse,
          content: <PlayerRelationsEditor playerId={playerId} config={configMap.get("injuries")!} />,
        },
        {
          id: "relationships",
          label: "Relationships",
          icon: Users,
          content: <PlayerRelationsEditor playerId={playerId} config={configMap.get("relationships")!} />,
        },
      ]}
    />
  );
}
