import { useState } from "react";
import { Dumbbell, FileText, SlidersHorizontal } from "lucide-react";

import { EntityForm, EntityPicker, Tabs } from "../../../shared/components";
import { people } from "../../people/data/people.data";
import { clubs, teams } from "../../teams/data/teams.data";
import { usePlayerEditor } from "../hooks/usePlayerEditor";
import type { Player } from "../types";

const positions = [
  { id: 1, label: "Goalkeeper" },
  { id: 2, label: "Centre Back" },
  { id: 3, label: "Full Back" },
  { id: 4, label: "Defensive Midfielder" },
  { id: 5, label: "Central Midfielder" },
  { id: 6, label: "Attacking Midfielder" },
  { id: 7, label: "Winger" },
  { id: 8, label: "Striker" },
];

const attributeGroups = {
  technical: [
    ["corners", "Corners"],
    ["crossing", "Crossing"],
    ["dribbling", "Dribbling"],
    ["finishing", "Finishing"],
    ["first_touch", "First Touch"],
    ["passing", "Passing"],
    ["tackling", "Tackling"],
    ["technique", "Technique"],
  ],
  physical: [
    ["acceleration", "Acceleration"],
    ["agility", "Agility"],
    ["balance", "Balance"],
    ["fitness", "Fitness"],
    ["pace", "Pace"],
    ["stamina", "Stamina"],
    ["strength", "Strength"],
  ],
  psychological: [
    ["anticipation", "Anticipation"],
    ["composure", "Composure"],
    ["concentration", "Concentration"],
    ["decisions", "Decisions"],
    ["determination", "Determination"],
    ["teamwork", "Teamwork"],
    ["vision", "Vision"],
    ["work_rate", "Work Rate"],
  ],
  goalkeeper: [
    ["handling", "Handling"],
    ["reflexes", "Reflexes"],
    ["one_on_ones", "One on Ones"],
    ["kicking", "Kicking"],
    ["command_of_area", "Command of Area"],
  ],
} as const;

type AttributeCategory = keyof typeof attributeGroups;

interface PlayerEditorProps {
  player?: Player;
  onBack: () => void;
}

export function PlayerEditor({ player, onBack }: PlayerEditorProps) {
  const editor = usePlayerEditor(player);
  const [activeTab, setActiveTab] = useState<"football" | "attributes" | "contract">("football");

  const personOptions = people.map((person) => ({
    id: person.id,
    label: person.fullName,
  }));

  const clubOptions = clubs.map((club) => {
    const team = teams.find((item) => item.id === club.teamId);
    return { id: club.teamId, label: team?.name ?? "Club #" + club.teamId };
  });

  const fields = [
    { name: "potential", label: "Potential", type: "number" as const },
    { name: "estimatedValue", label: "Estimated Value", type: "number" as const },
    { name: "leftFoot", label: "Left Foot", type: "number" as const },
    { name: "rightFoot", label: "Right Foot", type: "number" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            PEOPLE / PLAYER
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {people.find((person) => person.id === player?.personId)?.fullName ?? "New Player"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Player extends Person with positions, attributes and contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          Back
        </button>
      </div>

      <EntityPicker
        label="Person"
        value={editor.draft.personId}
        options={personOptions}
        onChange={(value) => editor.setValue("personId", String(value))}
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "football",
            label: "Football",
            icon: Dumbbell,
            content: (
              <div className="space-y-5">
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                    POSITIONS
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {positions.map((position) => {
                      const selected = editor.draft.positionIds.includes(position.id);
                      return (
                        <label
                          key={position.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => editor.togglePosition(position.id)}
                          />
                          {position.label}
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <EntityForm
                    fields={fields}
                    values={{
                      potential: editor.draft.potential,
                      estimatedValue: editor.draft.estimatedValue,
                      leftFoot: editor.draft.leftFoot,
                      rightFoot: editor.draft.rightFoot,
                    }}
                    onChange={(name, value) => {
                      if (name !== "positionIds") {
                        editor.setValue(name as Exclude<keyof typeof editor.draft, "positionIds" | "attributes">, value);
                      }
                    }}
                    onSubmit={() => undefined}
                    submitLabel={player ? "Save Player" : "Create Player"}
                  />
                </section>
              </div>
            ),
          },
          {
            id: "attributes",
            label: "Attributes",
            icon: SlidersHorizontal,
            content: (
              <div className="grid gap-5 md:grid-cols-2">
                {(Object.keys(attributeGroups) as AttributeCategory[]).map((category) => (
                  <section
                    key={category}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                  >
                    <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {category}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {attributeGroups[category].map(([key, label]) => (
                        <label key={key} className="space-y-2">
                          <span className="block text-xs font-medium text-slate-400">{label}</span>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={editor.draft.attributes[category][key] ?? ""}
                            onChange={(event) =>
                              editor.setAttribute(category, key, event.target.value)
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-400/30"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ),
          },
          {
            id: "contract",
            label: "Contract",
            icon: FileText,
            content: (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <EntityPicker
                    label="Club"
                    value={editor.draft.clubId}
                    options={clubOptions}
                    onChange={(value) => editor.setValue("clubId", String(value))}
                  />
                  <EntityPicker
                    label="Contract"
                    value={editor.draft.contractId}
                    options={[{ id: 1, label: "Current contract" }]}
                    onChange={(value) => editor.setValue("contractId", String(value))}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
