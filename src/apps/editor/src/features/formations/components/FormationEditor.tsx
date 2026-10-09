import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EntityForm, Tabs } from "../../../shared/components";
import { FormationPitch } from "./FormationPitch";
import { FormationPositionList } from "./FormationPositionList";
import { FormationRolesPanel } from "./FormationRolesPanel";
import { FormationInstructionsPanel } from "./FormationInstructionsPanel";
import { TacticalPositionInspector } from "./TacticalPositionInspector";
import { TacticalFormationSummary } from "./TacticalFormationSummary";
import { useFormationEditor } from "../hooks/useFormationEditor";
import type { Formation, FormationPosition } from "../types";

interface FormationEditorProps {
  formation?: Formation;
  onBack: () => void;
  onSaved?: () => void;
}

export function FormationEditor({
  formation,
  onBack,
  onSaved,
}: FormationEditorProps) {
  const editor = useFormationEditor(formation, onSaved);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(
    formation?.positions[0]?.id ?? null,
  );

  const selectedPosition = useMemo(
    () =>
      editor.draft.positions.find(
        (position) => position.id === selectedPositionId,
      ) ?? null,
    [editor.draft.positions, selectedPositionId],
  );

  function handleMove(id: number, x: number, y: number) {
    const side: FormationPosition["side"] =
      x < 33 ? "left" : x > 66 ? "right" : "center";

    editor.updatePosition(id, { x, y, side });
  }

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
            Build the shape visually, then connect every slot to a position, role,
            duty and tactical instruction.
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

      {(editor.error || editor.saveError) && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {editor.error ?? editor.saveError}
        </div>
      )}

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
          if (name === "name") editor.setValue("name", String(value));
          if (name === "description") {
            editor.setValue("description", String(value));
          }
        }}
        onSubmit={() => void editor.save()}
        submitLabel={editor.saving ? "Saving..." : "Save Formation"}
        submitting={editor.saving}
        error={editor.saveError}
      />

      <TacticalFormationSummary
        positions={editor.draft.positions}
        roles={editor.roles}
        duties={editor.duties}
      />

      <Tabs
        activeTab="shape"
        onChange={() => undefined}
        items={[
          {
            id: "shape",
            label: "Pitch & Positions",
            content: (
              <div className="space-y-5">
                <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                  <div className="space-y-3">
                    <FormationPitch
                      positions={editor.draft.positions}
                      positionNames={editor.positionNames}
                      selectedPositionId={selectedPositionId}
                      onSelect={setSelectedPositionId}
                      onMove={handleMove}
                    />
                    <p className="text-xs text-slate-600">
                      Drag a marker to change its tactical zone. Select a marker
                      to inspect role, duty and required attributes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <TacticalPositionInspector
                      position={selectedPosition}
                      positionName={
                        selectedPosition
                          ? editor.positionNames.get(
                              selectedPosition.positionId,
                            )
                          : undefined
                      }
                      role={
                        selectedPosition
                          ? editor.roles.find(
                              (role) => role.id === selectedPosition.roleId,
                            )
                          : undefined
                      }
                      duty={
                        selectedPosition
                          ? editor.duties.find(
                              (duty) => duty.id === selectedPosition.dutyId,
                            )
                          : undefined
                      }
                    />

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[240px] flex-1">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                          Add position
                        </label>
                        <select
                          defaultValue=""
                          className="w-full rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300"
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (!value) return;
                            editor.addPosition(value);
                            event.currentTarget.value = "";
                          }}
                        >
                          <option value="">Select a position...</option>
                          {editor.positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-500">
                        {editor.draft.positions.length} / 11 slots
                      </div>
                    </div>

                    <FormationPositionList
                      positions={editor.draft.positions}
                      roles={editor.roles}
                      duties={editor.duties}
                      positionNames={editor.positionNames}
                      onRoleChange={editor.setRole}
                      onDutyChange={editor.setDuty}
                      onSideChange={(id, side) =>
                        editor.updatePosition(id, { side })
                      }
                      onRemove={editor.removePosition}
                      onSelect={setSelectedPositionId}
                      selectedPositionId={selectedPositionId}
                    />
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "instructions",
            label: "Tactical Instructions",
            content: (
              <FormationInstructionsPanel
                instructions={editor.instructions}
                values={editor.draft.instructions}
                onChange={editor.setInstruction}
              />
            ),
          },
          {
            id: "roles",
            label: "Roles & Duties",
            content: (
              <FormationRolesPanel
                roles={editor.roles}
                duties={editor.duties}
                positionNames={editor.positionNames}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
