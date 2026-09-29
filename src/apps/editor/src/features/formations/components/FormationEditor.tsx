import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { EntityForm, Tabs } from "../../../shared/components";
import { duties, getDuty, getPosition, getRole, roles } from "../data/formations.data";
import { useFormationEditor } from "../hooks/useFormationEditor";
import type { Formation } from "../types";

interface FormationEditorProps {
  formation?: Formation;
  onBack: () => void;
}

export function FormationEditor({ formation, onBack }: FormationEditorProps) {
  const editor = useFormationEditor(formation);
  const [activeTab, setActiveTab] = useState<"shape" | "roles">("shape");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            TACTICS / FORMATION
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {editor.draft.name || "New Formation"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Define the formation shape first, then assign a role and duty to each position.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      <EntityForm
        fields={[
          { name: "name", label: "Formation Name", required: true },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        values={{
          name: editor.draft.name,
          description: editor.draft.description ?? "",
        }}
        onChange={(name, value) => {
          if (name === "name" || name === "description") {
            editor.setValue(name, value);
          }
        }}
        onSubmit={() => undefined}
        submitLabel={<><Save size={14} /> Save Formation</>}
      />

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "shape",
            label: "Positions",
            content: (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Pitch positions={editor.draft.positions} />
                <div className="space-y-3">
                  {editor.draft.positions.map((position) => {
                    const positionDefinition = getPosition(position.positionId);
                    const role = getRole(position.roleId);
                    const duty = getDuty(position.dutyId);

                    return (
                      <div
                        key={position.id}
                        className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-[90px_1fr_160px_130px]"
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {position.label}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            {positionDefinition?.name}
                          </div>
                        </div>

                        <div className="text-xs text-slate-500">
                          Slot {position.id}
                        </div>

                        <select
                          value={position.roleId}
                          onChange={(event) =>
                            editor.setRole(position.id, Number(event.target.value))
                          }
                          className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300 outline-none"
                        >
                          {editor.getAvailableRoles(position.positionId).map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={position.dutyId}
                          onChange={(event) =>
                            editor.updatePosition(position.id, {
                              dutyId: Number(event.target.value),
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300 outline-none"
                        >
                          {editor.getAvailableDuties(position.roleId).map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            id: "roles",
            label: "Roles & Duties",
            content: (
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                  >
                    <div className="text-sm font-semibold text-white">{role.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getPosition(role.positionId)?.name}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      {role.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {role.dutyIds.map((dutyId) => (
                        <span
                          key={dutyId}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400"
                        >
                          {getDuty(dutyId)?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function Pitch({ positions }: { positions: Formation["positions"] }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-emerald-300/10 bg-[#10251d]">
      <div className="absolute inset-4 rounded-xl border border-white/10" />
      <div className="absolute left-1/2 top-1/2 h-px w-[calc(100%-32px)] -translate-x-1/2 bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-4 h-16 w-32 -translate-x-1/2 rounded-b-xl border border-t-0 border-white/10" />
      <div className="absolute bottom-4 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-xl border border-b-0 border-white/10" />

      {positions.map((position) => (
        <div
          key={position.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: position.x + "%", top: position.y + "%" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/30 bg-[#132b22] text-[11px] font-semibold text-emerald-200 shadow-lg shadow-black/20">
            {position.label}
          </div>
        </div>
      ))}
    </div>
  );
}
