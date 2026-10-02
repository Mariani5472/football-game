import { useMemo, useState } from "react";
import { Dumbbell, HeartPulse, History, SlidersHorizontal, Users } from "lucide-react";
import { EntityPicker, Tabs } from "../../../shared/components";
import { PlayerRelationsEditor } from "./PlayerRelationsEditor";
import { playerRelationConfigs, playerRelationGroups } from "../config/playerConfig";
import { usePlayerEditor } from "../hooks/usePlayerEditor";

function categoryLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

export function PlayerEditor({ playerId, onBack, onSaved }: { playerId?: number; onBack: () => void; onSaved: (id: number) => void }) {
  const editor = usePlayerEditor(playerId);
  const [tab, setTab] = useState("overview");
  const [personId, setPersonId] = useState(playerId ? String(playerId) : "");
  const [core, setCore] = useState<Record<string, string>>({});
  const configMap = useMemo(() => new Map(playerRelationConfigs.map(config => [config.id, config])), []);

  const categories = useMemo(
    () => [...new Set(editor.definitions.map(definition => definition.category))],
    [editor.definitions],
  );
  const personLabel = editor.player?.full_name ?? (playerId ? `Person #${playerId}` : "New Player");

  function setCoreValue(name: string, value: string) {
    setCore(current => ({ ...current, [name]: value }));
  }

  async function save() {
    const values = {
      person_id: Number(personId),
      potential_capacity: core.potential_capacity ? Number(core.potential_capacity) : null,
      potential: core.potential ? Number(core.potential) : null,
      estimated_value: core.estimated_value ? Number(core.estimated_value) : null,
      left_foot: core.left_foot ? Number(core.left_foot) : null,
      right_foot: core.right_foot ? Number(core.right_foot) : null,
    };
    await editor.saveCore(values);
    onSaved(Number(personId));
  }

  if (editor.loading && playerId) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">Loading player...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PEOPLE / PLAYER</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{personLabel}</h1>
          <p className="mt-2 text-sm text-slate-500">Player extends Person. All player attributes and weights are loaded from World DB.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button>
      </div>

      {editor.error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{editor.error}</div>}

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "overview", label: "Core", icon: Dumbbell,
            content: (
              <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <EntityPicker label="Person" table="person" labelColumn="full_name" value={personId} onChange={value => setPersonId(String(value))} />
                  {[
                    ["potential_capacity", "Potential Capacity"], ["potential", "Potential"], ["estimated_value", "Estimated Value"], ["left_foot", "Left Foot"], ["right_foot", "Right Foot"],
                  ].map(([name, label]) => (
                    <label key={name} className="space-y-1.5">
                      <span className="block text-xs font-medium text-slate-400">{label}</span>
                      <input type="number" value={core[name] ?? editor.player?.[name] ?? ""} onChange={event => setCoreValue(name, event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" />
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button type="button" disabled={editor.saving || !personId} onClick={() => void save()} className="rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50">{editor.saving ? "Saving..." : "Save Player"}</button>
                </div>
              </section>
            ),
          },
          {
            id: "positions", label: "Positions & Roles", icon: Dumbbell,
            content: (
              <div className="space-y-5">
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div><h3 className="text-sm font-semibold text-white">Positions</h3><p className="mt-1 text-xs text-slate-600">Position membership and player-specific rating.</p></div>
                    <span className="text-xs text-slate-600">{editor.selectedPositions.length} selected</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {editor.positions.map(position => {
                      const id = Number(position.id);
                      const selected = editor.selectedPositions.includes(id);
                      return (
                        <div key={id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={selected} onChange={() => editor.togglePosition(id)} />{String(position.name)}</label>
                          {selected && <input type="number" min={0} max={20} value={editor.positionRatings[id] ?? ""} onChange={event => editor.setPositionRating(id, event.target.value)} placeholder="Rating 0-20" className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200" />}
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <h3 className="text-sm font-semibold text-white">Roles</h3>
                  <p className="mt-1 text-xs text-slate-600">Roles come from player_role; ratings are stored in player_role_rating.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {editor.roles.map(role => {
                      const id = Number(role.id);
                      return <div key={id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><div className="text-sm text-slate-300">{String(role.name)}</div><div className="mt-1 text-[11px] text-slate-600">{String(role.description ?? "")}</div><input type="number" min={0} max={20} value={editor.roleRatings[id] ?? ""} onChange={event => editor.setRoleRating(id, event.target.value)} placeholder="Role rating 0-20" className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200" /></div>;
                    })}
                  </div>
                  <button type="button" disabled={editor.saving || !playerId} onClick={() => void save()} className="mt-4 rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200 disabled:opacity-50">Save Positions & Roles</button>
                </section>
              </div>
            ),
          },
          {
            id: "attributes", label: "Attributes", icon: SlidersHorizontal,
            content: (
              <div className="space-y-5">
                {categories.map(category => {
                  const definitions = editor.definitions.filter(definition => definition.category === category && !definition.is_hidden);
                  return (
                    <section key={category} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                      <div className="mb-5"><h3 className="text-sm font-semibold text-white">{categoryLabel(category)}</h3><p className="mt-1 text-xs text-slate-600">{definitions.length} database-defined attributes</p></div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {definitions.map(definition => {
                          const scale = editor.scaleMap.get(definition.scale_id ?? 0);
                          const value = editor.attributes[category]?.[definition.attribute_key] ?? "";
                          return <label key={definition.id} className="space-y-1.5"><span className="block text-xs font-medium text-slate-400">{definition.name}</span><input type="number" min={scale?.minimumValue} max={scale?.maximumValue} value={value} onChange={event => editor.setAttribute(category, definition.attribute_key, event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /><span className="block text-[10px] text-slate-700">{scale ? `Scale: ${scale.name} (${scale.minimumValue}–${scale.maximumValue})` : "No scale configured"}</span></label>;
                        })}
                      </div>
                    </section>
                  );
                })}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="text-xs text-slate-500">Position-weighted: {editor.weightedRating(editor.positionWeights.filter(weight => editor.selectedPositions.includes(weight.positionId)))} | Role-weighted: {editor.weightedRating(editor.roleWeights.filter(weight => Object.keys(editor.roleRatings).map(Number).includes(weight.roleId)))}</div><button type="button" disabled={editor.saving || !playerId} onClick={() => void save()} className="rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200 disabled:opacity-50">Save Attributes</button></div>
              </div>
            ),
          },
          {
            id: "relations", label: "Career & Records", icon: History,
            content: playerId ? <div className="space-y-5">{playerRelationGroups.slice(0, 3).map(group => <div key={group.id} className="space-y-5"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{group.label}</div>{group.relationIds.map(id => { const relation = configMap.get(id); return relation ? <PlayerRelationsEditor key={id} playerId={playerId} config={relation} /> : null; })}</div>)}</div> : <EmptyPlayerMessage />,
          },
          {
            id: "health", label: "Health", icon: HeartPulse,
            content: playerId ? <PlayerRelationsEditor playerId={playerId} config={configMap.get("injuries")!} /> : <EmptyPlayerMessage />,
          },
          {
            id: "relationships", label: "Relationships", icon: Users,
            content: playerId ? <PlayerRelationsEditor playerId={playerId} config={configMap.get("relationships")!} /> : <EmptyPlayerMessage />,
          },
        ]}
      />
    </div>
  );
}

function EmptyPlayerMessage() {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">Save the player first to manage related records.</div>;
}
