import { EntityForm, EntityPicker } from "../../../shared/components";
import type { PersonDraft, PersonReferenceData } from "../types";

export function PersonIdentityTab({ draft, references, onChange, saving, onSave }: {
  draft: PersonDraft;
  references: PersonReferenceData;
  onChange: <K extends keyof PersonDraft>(name: K, value: PersonDraft[K]) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <EntityForm
      fields={[
        { name: "firstName", label: "First Name" }, { name: "secondName", label: "Second Name" },
        { name: "commonName", label: "Common Name" }, { name: "fullName", label: "Full Name", required: true },
        { name: "birthDate", label: "Birth Date", type: "date" }, { name: "height", label: "Height (cm)", type: "number", min: 0, max: 250 },
        { name: "sex", label: "Sex" },
      ]}
      values={draft}
      onChange={(name, value) => onChange(name as keyof PersonDraft, value as never)}
      onSubmit={onSave} submitLabel={saving ? "Saving..." : "Save Identity"} submitting={saving}
    />
    <div className="grid gap-5 md:grid-cols-3">
      <EntityPicker label="Person Type" value={draft.personTypeId} options={references.personTypes.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => onChange("personTypeId", String(value))} />
      <EntityPicker label="Birth City" value={draft.birthCityId} options={references.cities.map(row => ({ id: Number(row.id), label: String(row.name ?? row.id) }))} onChange={value => onChange("birthCityId", String(value))} />
      <EntityPicker label="Agent / Representative" value={draft.agentPersonId} options={references.people.filter(row => Number(row.id) !== 0).map(row => ({ id: Number(row.id), label: String(row.full_name ?? row.id) }))} onChange={value => onChange("agentPersonId", String(value))} />
    </div>
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
      <input type="checkbox" checked={draft.retirementAfterCurrentClub} onChange={event => onChange("retirementAfterCurrentClub", event.target.checked)} disabled={saving} />
      Retirement after current club
    </label>
  </section>;
}
