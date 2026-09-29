import { Building2, Settings2, SlidersHorizontal } from "lucide-react";
import { EntityForm, EntityPicker, Tabs } from "../../../../shared/components";
import { cities } from "../../world/data/world.data";
import { clubs } from "../../teams/data/teams.data";
import { teams } from "../../teams/data/teams.data";
import { stadiums } from "../data/stadiums.data";
import { useStadiumEditor } from "../hooks/useStadiumEditor";
import type { Stadium } from "../types";

const pitchOptions = [
  { id: 1, label: "Natural grass" },
  { id: 2, label: "Artificial turf" },
];

const qualityOptions = [
  { id: 1, label: "Poor" },
  { id: 2, label: "Average" },
  { id: 3, label: "Good" },
  { id: 4, label: "Excellent" },
];

const environmentOptions = [
  { id: 1, label: "Poor" },
  { id: 2, label: "Average" },
  { id: 3, label: "Good" },
  { id: 4, label: "Excellent" },
];

const deteriorationOptions = [
  { id: 1, label: "Low" },
  { id: 2, label: "Medium" },
  { id: 3, label: "High" },
];

interface StadiumEditorProps {
  stadium: Stadium;
  onBack: () => void;
}

export function StadiumEditor({ stadium, onBack }: StadiumEditorProps) {
  const { draft, setValue } = useStadiumEditor(stadium);

  const generalFields = [
    { name: "name", label: "Name", required: true },
    { name: "capacity", label: "Capacity", type: "number" as const },
    { name: "seatedCapacity", label: "Seated capacity", type: "number" as const },
  ];

  const infrastructureFields = [
    { name: "fieldLength", label: "Field length" },
    { name: "fieldWidth", label: "Field width" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            STADIUM
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {stadium.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure the stadium identity, location and match-day infrastructure.
          </p>
        </div>

        <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
          Back
        </button>
      </div>

      <Tabs
        activeTab="general"
        onChange={() => undefined}
        items={[
          {
            id: "general",
            label: "General",
            content: (
              <div className="grid gap-5 lg:grid-cols-2">
                <SectionCard title="Identity" icon={Building2}>
                  <EntityForm
                    fields={generalFields}
                    values={{
                      name: draft.name,
                      capacity: draft.capacity,
                      seatedCapacity: draft.seatedCapacity,
                    }}
                    onChange={(name, value) => {
                      if (name === "name" || name === "capacity" || name === "seatedCapacity") {
                        setValue(name, value);
                      }
                    }}
                    onSubmit={() => undefined}
                    submitLabel="Save"
                  />
                </SectionCard>

                <SectionCard title="Relationships" icon={SlidersHorizontal}>
                  <EntityPicker
                    label="City"
                    value={draft.cityId}
                    options={cities.map((city) => ({ id: city.id, label: city.name }))}
                    onChange={(value) => setValue("cityId", value)}
                  />
                  <EntityPicker
                    label="Owner"
                    value={draft.ownerClubId}
                    options={clubs.map((club) => ({
                      id: club.teamId,
                      label: teams.find((team) => team.id === club.teamId)?.name ?? "Unknown club",
                    }))}
                    onChange={(value) => setValue("ownerClubId", value)}
                  />
                  <EntityPicker
                    label="Pitch"
                    value={draft.pitchTypeId}
                    options={pitchOptions}
                    onChange={(value) => setValue("pitchTypeId", value)}
                  />
                </SectionCard>
              </div>
            ),
          },
          {
            id: "quality",
            label: "Quality",
            content: (
              <div className="grid gap-5 md:grid-cols-2">
                <SectionCard title="Quality">
                  <EntityPicker label="Quality" value={draft.qualityStateId} options={qualityOptions} onChange={(value) => setValue("qualityStateId", value)} />
                  <EntityPicker label="Environment" value={draft.environmentQualityId} options={environmentOptions} onChange={(value) => setValue("environmentQualityId", value)} />
                </SectionCard>
                <SectionCard title="Field">
                  <EntityPicker label="Field deterioration" value={draft.grassDeteriorationRateId} options={deteriorationOptions} onChange={(value) => setValue("grassDeteriorationRateId", value)} />
                </SectionCard>
              </div>
            ),
          },
          {
            id: "facilities",
            label: "Facilities",
            content: (
              <SectionCard title="Facilities">
                <Toggle label="Cover" value={draft.hasCover} onChange={(value) => setValue("hasCover", value)} />
                <Toggle label="Retractable roof" value={draft.hasRetractableRoof} onChange={(value) => setValue("hasRetractableRoof", value)} />
                <Toggle label="Underfloor heating" value={draft.hasUnderfloorHeating} onChange={(value) => setValue("hasUnderfloorHeating", value)} />
                <Toggle label="Digital advertising" value={draft.hasDigitalAdvertising} onChange={(value) => setValue("hasDigitalAdvertising", value)} />
              </SectionCard>
            ),
          },
        ]}
      />
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        {Icon ? <Icon size={14} /> : null}
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}