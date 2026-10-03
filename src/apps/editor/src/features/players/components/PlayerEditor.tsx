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

export function PlayerEditor({
  playerId,
  onBack,
  onSaved,
}: {
  playerId?: number;
  onBack: () => void;
  onSaved: (id: number) => void;
}) {
  const editor = usePlayerEditor(playerId);
  const [tab, setTab] = useState("overview");
  const [personId, setPersonId] = useState(playerId ? String(playerId) : "");
  const [core, setCore] = useState<Record<string, string>>({});

  const configMap = useMemo(
    () => new Map(playerRelationConfigs.map(config => [config.id, config])),
    [],
  );

  const categories = useMemo(
    () => [...new Set(editor.definitions.map(definition => definition.category))],
    [editor.definitions],
  );

  const personLabel =
    editor.player?.full_name ??
    (playerId ? `Person #${playerId}` : "New Player");

  async function saveCore() {
    await editor.saveCore({
      person_id: Number(personId),
      potential_capacity: core.potential_capacity ? Number(core.potential_capacity) : null,
      potential: core.potential ? Number(core.potential) : null,
      estimated_value: core.estimated_value ? Number(core.estimated_value) : null,
      left_foot: core.left_foot ? Number(core.left_foot) : null,
      right_foot: core.right_foot ? Number(core.right_foot) : null,
    });
    onSaved(Number(personId));
  }

  if (editor.loading && playerId) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
        Loading player...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            PEOPLE / PLAYER
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{personLabel}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Player extends Person. Player data is organized by core identity, tactical profile,
            attributes and relationships.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400"
        >
          Back
        </button>
      </header>

      {editor.error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {editor.error}
        </div>
      )}

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "overview",
            label: "Core",
            icon: Dumbbell,
            content: (
              <PlayerCorePanel
                player={editor.player}
                values={core}
                personId={personId}
                saving={editor.saving}
                onPersonChange={setPersonId}
                onFieldChange={(name, value) =>
                  setCore(current => ({ ...current, [name]: value }))
                }
                onSave={() => void saveCore()}
              />
            ),
          },
          {
            id: "positions",
            label: "Positions & Roles",
            icon: Dumbbell,
            content: (
              <PlayerPositionsPanel
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
              />
            ),
          },
          {
            id: "attributes",
            label: "Attributes",
            icon: SlidersHorizontal,
            content: (
              <PlayerAttributesPanel
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
              />
            ),
          },
          {
            id: "relations",
            label: "Career & Records",
            icon: History,
            content: <PlayerRelationTabs playerId={playerId} />,
          },
          {
            id: "health",
            label: "Health",
            icon: HeartPulse,
            content: playerId ? (
              <PlayerRelationsEditor
                playerId={playerId}
                config={configMap.get("injuries")!}
              />
            ) : (
              <PlayerRelationTabs playerId={playerId} />
            ),
          },
          {
            id: "relationships",
            label: "Relationships",
            icon: Users,
            content: playerId ? (
              <PlayerRelationsEditor
                playerId={playerId}
                config={configMap.get("relationships")!}
              />
            ) : (
              <PlayerRelationTabs playerId={playerId} />
            ),
          },
        ]}
      />
    </div>
  );
}
