import { useMemo, useState } from "react";
import { Dumbbell, HeartPulse, History, SlidersHorizontal, Users } from "lucide-react";
import { Tabs } from "../../../shared/components";
import { PlayerRelationsEditor } from "./PlayerRelationsEditor";
import { PlayerCorePanel } from "./PlayerCorePanel";
import { PlayerPositionsPanel } from "./PlayerPositionsPanel";
import { PlayerAttributesPanel } from "./PlayerAttributesPanel";
import { PlayerRelationTabs } from "./PlayerRelationTabs";
import { playerRelationConfigs } from "../config/playerConfig";
import { usePlayerEditor } from "../hooks/usePlayerEditor";

const relationConfigMap = new Map(playerRelationConfigs.map(config => [config.id, config]));

export function PlayerEditor({ playerId, onBack, onSaved }: {
  playerId?: number;
  onBack: () => void;
  onSaved: (id: number) => void;
}) {
  const editor = usePlayerEditor(playerId);
  const [tab, setTab] = useState("overview");
  const [personId, setPersonId] = useState(playerId ? String(playerId) : "");
  const [core, setCore] = useState<Record<string, string>>({});

  const categories = useMemo(
    () => [...new Set(editor.definitions.map(definition => definition.category))],
    [editor.definitions],
  );

  const personLabel = editor.player?.full_name ?? (playerId ? `Player / Person #${playerId}` : "New Player");

  async function saveCore() {
    const resolvedId = Number(personId);
    if (!Number.isFinite(resolvedId) || resolvedId <= 0) throw new Error("A Person is required.");

    const savedId = await editor.saveCore({
      person_id: resolvedId,
      potential_capacity: core.potential_capacity ? Number(core.potential_capacity) : null,
      potential: core.potential ? Number(core.potential) : null,
      estimated_value: core.estimated_value ? Number(core.estimated_value) : null,
      left_foot: core.left_foot ? Number(core.left_foot) : null,
      right_foot: core.right_foot ? Number(core.right_foot) : null,
    });

    onSaved(Number(savedId));
  }

  const relation = (id: string) => relationConfigMap.get(id);

  if (editor.loading && playerId) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">Loading player...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PEOPLE / PLAYER</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{personLabel}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-500">
            Player = Person + player-specific football data. Manage ability, potential, value, attributes,
            positions, roles, contracts, injuries, suspensions, relationships, club and national history and achievements.
          </p>
        </div>
        <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button>
      </header>

      {editor.error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{editor.error}</div>}

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "overview",
            label: "Core",
            icon: Dumbbell,
            content: <PlayerCorePanel
              player={editor.player}
              values={core}
              personId={personId}
              saving={editor.saving}
              onPersonChange={setPersonId}
              onFieldChange={(name, value) => setCore(current => ({ ...current, [name]: value }))}
              onSave={() => void saveCore()}
            />,
          },
          {
            id: "positions",
            label: "Positions & Roles",
            icon: Dumbbell,
            content: <PlayerPositionsPanel
              positions={editor.positions}
              roles={editor.roles}
              selectedPositions={editor.selectedPositions}
              positionRatings={editor.positionRatings}
              roleRatings={editor.roleRatings}
              saving={editor.saving}
              onTogglePosition={editor.togglePosition}
              onPositionRating={editor.setPositionRating}
              onRoleRating={editor.setRoleRating}
              onSave={() => void saveCore()}
            />,
          },
          {
            id: "attributes",
            label: "Attributes",
            icon: SlidersHorizontal,
            content: <PlayerAttributesPanel
              categories={categories}
              definitions={editor.definitions}
              scaleMap={editor.scaleMap}
              attributes={editor.attributes}
              positionWeights={editor.positionWeights}
              roleWeights={editor.roleWeights}
              selectedPositions={editor.selectedPositions}
              roleRatings={editor.roleRatings}
              saving={editor.saving}
              onChange={editor.setAttribute}
              onSave={() => void saveCore()}
              weightedRating={editor.weightedRating}
            />,
          },
          {
            id: "contracts",
            label: "Contracts",
            icon: History,
            content: relation("contracts")
              ? <PlayerRelationsEditor playerId={playerId ?? 0} config={relation("contracts")!} />
              : <PlayerRelationTabs playerId={playerId} />,
          },
          {
            id: "clauses",
            label: "Clauses",
            icon: History,
            content: relation("clauses")
              ? <PlayerRelationsEditor playerId={playerId ?? 0} config={relation("clauses")!} />
              : <PlayerRelationTabs playerId={playerId} />,
          },
          {
            id: "movement",
            label: "Movement",
            icon: History,
            content: <div className="space-y-5">
              {["club-periods", "national-team-periods", "transfers", "legacy-transfers", "loans"].map(id =>
                relation(id) ? <PlayerRelationsEditor key={id} playerId={playerId ?? 0} config={relation(id)!} /> : null,
              )}
            </div>,
          },
          {
            id: "history",
            label: "History & Achievements",
            icon: History,
            content: <div className="space-y-5">
              {["career", "titles", "achievements"].map(id =>
                relation(id) ? <PlayerRelationsEditor key={id} playerId={playerId ?? 0} config={relation(id)!} /> : null,
              )}
            </div>,
          },
          {
            id: "health",
            label: "Injuries & Suspensions",
            icon: HeartPulse,
            content: <div className="space-y-5">
              {relation("injuries") && <PlayerRelationsEditor playerId={playerId ?? 0} config={relation("injuries")!} />}
              {relation("suspensions") && <PlayerRelationsEditor playerId={playerId ?? 0} config={relation("suspensions")!} />}
              {playerId && relation("suspensions") && null}
            </div>,
          },
          {
            id: "relationships",
            label: "Relationships",
            icon: Users,
            content: relation("relationships")
              ? <PlayerRelationsEditor playerId={playerId ?? 0} config={relation("relationships")!} />
              : <PlayerRelationTabs playerId={playerId} />,
          },
          {
            id: "person",
            label: "Person Profile",
            icon: Users,
            content: <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
              Person identity is the shared parent entity. Use the People editor to modify the complete Person profile without duplicating it inside Player.
            </div>,
          },
        ]}
      />
    </div>
  );
}
