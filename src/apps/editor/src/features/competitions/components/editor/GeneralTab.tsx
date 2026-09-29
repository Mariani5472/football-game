import { EntityForm, EntityPicker } from "../../../../shared/components";
import { countries } from "../../../world/data/world.data";
import { useCompetitionEditor } from "../../hooks/useCompetitionEditor";

export function GeneralTab({
  editor,
}: {
  editor: ReturnType<typeof useCompetitionEditor>;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <EntityForm
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "shortName", label: "Short Name", required: true },
          { name: "type", label: "Type" },
        ]}
        values={{
          name: editor.draft.name,
          shortName: editor.draft.shortName,
          type: editor.draft.type,
        }}
        onChange={(name, value) => {
          if (name === "name" || name === "shortName" || name === "type") {
            editor.setCompetitionValue(name, value);
          }
        }}
        onSubmit={() => undefined}
        submitLabel="Save Competition"
      />
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <EntityPicker
          label="Country"
          value={editor.draft.countryId ?? ""}
          options={countries.map((country) => ({ id: country.id, label: country.name }))}
          onChange={(value) => editor.setCompetitionValue("countryId", Number(value))}
        />
        <NumberInput
          label="Level"
          value={editor.draft.level}
          onChange={(value) => editor.setCompetitionValue("level", value)}
        />
        <NumberInput
          label="Reputation"
          value={editor.draft.reputation}
          onChange={(value) => editor.setCompetitionValue("reputation", value)}
        />
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Field
      label={label}
      value={value === undefined ? "" : String(value)}
      onChange={(next) => onChange(next === "" ? undefined : Number(next))}
    />
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none"
      />
    </label>
  );
}