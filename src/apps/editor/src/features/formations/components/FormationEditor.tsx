import { ArrowLeft } from "lucide-react";
import { EntityForm, Tabs } from "../../../shared/components";
import { FormationPitch } from "./FormationPitch";
import { FormationPositionList } from "./FormationPositionList";
import { FormationRolesPanel } from "./FormationRolesPanel";
import { useFormationEditor } from "../hooks/useFormationEditor";
import type { Formation } from "../types";

interface FormationEditorProps {
  formation?: Formation;
  onBack: () => void;
}

export function FormationEditor({ formation, onBack }: FormationEditorProps) {
  const editor = useFormationEditor(formation);

  const positionNames = editor.positionNames;

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
          if (name === "name") editor.setValue("name", String(value));
          if (name === "description") editor.setValue("description", String(value));
        }}
        onSubmit={() => void editor.save()}
        submitLabel="Save Formation"
      />

      <Tabs
        activeTab="shape"
        onChange={() => undefined}
        items={[
          {
            id: "shape",
            label: "Positions",
            content: (
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <FormationPitch positions={editor.draft.positions} />
                <FormationPositionList
                  positions={editor.draft.positions}
                  roles={editor.roles}
                  duties={editor.duties}
                  positionNames={positionNames}
                  onRoleChange={editor.setRole}
                  onDutyChange={editor.setDuty}
                />
              </div>
            ),
          },
          {
            id: "roles",
            label: "Roles & Duties",
            content: (
              <FormationRolesPanel
                roles={editor.roles}
                duties={editor.duties}
                positionNames={positionNames}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
