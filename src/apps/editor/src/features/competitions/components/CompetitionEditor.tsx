import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { EntityForm, EntityPicker, Tabs } from "../../../shared/components";
import { teams } from "../../teams/data/teams.data";
import { countries } from "../../world/data/world.data";
import { useCompetitionEditor } from "../hooks/useCompetitionEditor";
import type { Competition, CompetitionSeason, CompetitionStage } from "../types";

interface CompetitionEditorProps {
  competition?: Competition;
  onBack: () => void;
}

export function CompetitionEditor({ competition, onBack }: CompetitionEditorProps) {
  const editor = useCompetitionEditor(competition);
  const [activeTab, setActiveTab] = useState<"general" | "seasons" | "teams" | "stages" | "history">("general");
  const season = editor.draft.seasons[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">COMPETITIONS</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{editor.draft.name || "New Competition"}</h1>
          <p className="mt-2 text-sm text-slate-500">Define the competition, seasons, participants and stages.</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          { id: "general", label: "General", content: <GeneralTab editor={editor} /> },
          { id: "seasons", label: "Seasons", content: <SeasonsTab seasons={editor.draft.seasons} onChange={editor.updateSeason} /> },
          { id: "teams", label: "Teams", content: <TeamsTab season={season} onChange={editor.updateSeason} /> },
          { id: "stages", label: "Stages", content: <StagesTab
                season={season}
                onChange={editor.updateStage}
                onRulesChange={editor.updateStageRules}
                onScheduleChange={editor.updateStageSchedule}
                onStandingChange={editor.updateStageStanding}
                onDrawChange={editor.updateStageDraw}
                onQualificationChange={editor.updateStageQualification}
              /> },
          { id: "history", label: "History", content: <HistoryTab seasons={editor.draft.seasons} /> },
        ]}
      />
    </div>
  );
}

function GeneralTab({ editor }: { editor: ReturnType<typeof useCompetitionEditor> }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <EntityForm
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "shortName", label: "Short Name", required: true },
          { name: "type", label: "Type" },
        ]}
        values={{ name: editor.draft.name, shortName: editor.draft.shortName, type: editor.draft.type }}
        onChange={(name, value) => {
          if (name === "name" || name === "shortName" || name === "type") editor.setCompetitionValue(name, value);
        }}
        onSubmit={() => undefined}
        submitLabel="Save Competition"
      />
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <EntityPicker label="Country" value={editor.draft.countryId ?? ""} options={countries.map((country) => ({ id: country.id, label: country.name }))} onChange={(value) => editor.setCompetitionValue("countryId", Number(value))} />
        <NumberInput label="Level" value={editor.draft.level} onChange={(value) => editor.setCompetitionValue("level", value)} />
        <NumberInput label="Reputation" value={editor.draft.reputation} onChange={(value) => editor.setCompetitionValue("reputation", value)} />
      </div>
    </section>
  );
}

function SeasonsTab({ seasons, onChange }: { seasons: CompetitionSeason[]; onChange: (id: number, patch: Partial<CompetitionSeason>) => void }) {
  return (
    <div className="space-y-3">
      {seasons.map((season) => (
        <div key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr_160px]">
            <NumberInput label="Year" value={season.year} onChange={(value) => onChange(season.id, { year: value ?? season.year })} />
            <Field label="Start" value={season.startDate} onChange={(value) => onChange(season.id, { startDate: value })} />
            <Field label="End" value={season.endDate} onChange={(value) => onChange(season.id, { endDate: value })} />
            <label className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">Status</span>
              <select value={season.status} onChange={(event) => onChange(season.id, { status: event.target.value as CompetitionSeason["status"] })} className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none">
                <option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({ season, onChange }: { season?: CompetitionSeason; onChange: (id: number, patch: Partial<CompetitionSeason>) => void }) {
  if (!season) return <Empty message="Create a season before assigning teams." />;
  const selected = new Set(season.teams);
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-5"><div className="text-sm font-medium text-slate-200">Participants</div><div className="mt-1 text-xs text-slate-500">{season.teams.length} teams selected</div></div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <label key={team.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={selected.has(team.id)} onChange={(event) => {
              const next = event.target.checked ? [...season.teams, team.id] : season.teams.filter((id) => id !== team.id);
              onChange(season.id, { teams: next });
            }} />
            {team.name}
          </label>
        ))}
      </div>
    </section>
  );
}

function StagesTab({ season, onChange, onRulesChange }: {
  season?: CompetitionSeason;
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
  onRulesChange: (id: number, patch: Partial<CompetitionStage["rules"]>) => void;
  onScheduleChange: (id: number, patch: Partial<CompetitionStage["schedule"]>) => void;
  onStandingChange: (id: number, patch: Partial<CompetitionStage["standing"]>) => void;
  onDrawChange: (id: number, patch: Partial<CompetitionStage["draw"]>) => void;
  onQualificationChange: (id: number, qualification: CompetitionStage["qualification"]) => void;
}) {
  if (!season) return <Empty message="Create a season before configuring stages." />;
  return (
    <div className="space-y-4">
      {season.stages.map((stage) => (
        <StageCard
          key={stage.id}
          stage={stage}
          seasonTeams={season.teams}
          onChange={onChange}
          onRulesChange={onRulesChange}
          onScheduleChange={onScheduleChange}
          onStandingChange={onStandingChange}
          onDrawChange={onDrawChange}
          onQualificationChange={onQualificationChange}
        />
      ))}
    </div>
  );
}

function StageCard({ stage, seasonTeams, onChange, onRulesChange, onScheduleChange, onStandingChange, onDrawChange, onQualificationChange }: {
  stage: CompetitionStage;
  seasonTeams: number[];
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
  onRulesChange: (id: number, patch: Partial<CompetitionStage["rules"]>) => void;
  onScheduleChange: (id: number, patch: Partial<CompetitionStage["schedule"]>) => void;
  onStandingChange: (id: number, patch: Partial<CompetitionStage["standing"]>) => void;
  onDrawChange: (id: number, patch: Partial<CompetitionStage["draw"]>) => void;
  onQualificationChange: (id: number, qualification: CompetitionStage["qualification"]) => void;
}) {
  const [tab, setTab] = useState<"participants" | "format" | "rules" | "schedule" | "standing" | "qualification" | "draw">("participants");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_180px_120px]">
        <Field label="Stage Name" value={stage.name} onChange={(value) => onChange(stage.id, { name: value })} />
        <label className="space-y-2">
          <span className="block text-xs font-medium text-slate-400">Format</span>
          <select value={stage.format} onChange={(event) => onChange(stage.id, { format: event.target.value as CompetitionStage["format"] })} className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none">
            <option value="LEAGUE">League</option><option value="GROUP">Group</option><option value="KNOCKOUT">Knockout</option>
          </select>
        </label>
        <NumberInput label="Order" value={stage.stageOrder} onChange={(value) => onChange(stage.id, { stageOrder: value ?? stage.stageOrder })} />
      </div>

      <Tabs activeTab={tab} onChange={setTab} items={[
        { id: "participants", label: "Participants", content: <ParticipantsPanel stage={stage} seasonTeams={seasonTeams} onChange={onChange} /> },
        { id: "format", label: "Format", content: <FormatPanel stage={stage} onRulesChange={onRulesChange} /> },
        { id: "rules", label: "Rules", content: <RulesPanel stage={stage} /> },
        { id: "schedule", label: "Schedule", content: <SchedulePanel stage={stage} onChange={onScheduleChange} /> },
        { id: "standing", label: "Standing", content: <StandingPanel stage={stage} onChange={onStandingChange} /> },
        { id: "qualification", label: "Qualification", content: <QualificationPanel stage={stage} onChange={onQualificationChange} /> },
        { id: "draw", label: "Draw", content: <DrawPanel stage={stage} onChange={onDrawChange} /> },
      ]} />
    </div>
  );
}

function ParticipantsPanel({ stage, seasonTeams, onChange }: { stage: CompetitionStage; seasonTeams: number[]; onChange: (id: number, patch: Partial<CompetitionStage>) => void }) {
  const selected = new Set(stage.participants);
  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
      {seasonTeams.map((teamId) => (
        <label key={teamId} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
          <input type="checkbox" checked={selected.has(teamId)} onChange={(event) => {
            const participants = event.target.checked
              ? [...stage.participants, teamId]
              : stage.participants.filter((id) => id !== teamId);
            onChange(stage.id, { participants });
          }} />
          Team #{teamId}
        </label>
      ))}
    </div>
  );
}

function FormatPanel({ stage, onRulesChange }: { stage: CompetitionStage; onRulesChange: (id: number, patch: Partial<CompetitionStage["rules"]>) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <NumberInput label="Legs" value={stage.rules.legs} onChange={(value) => onRulesChange(stage.id, { legs: value ?? 1 })} />
      <NumberInput label="Points for win" value={stage.rules.pointsForWin} onChange={(value) => onRulesChange(stage.id, { pointsForWin: value ?? 3 })} />
      <NumberInput label="Points for draw" value={stage.rules.pointsForDraw} onChange={(value) => onRulesChange(stage.id, { pointsForDraw: value ?? 1 })} />
      <NumberInput label="Points for loss" value={stage.rules.pointsForLoss} onChange={(value) => onRulesChange(stage.id, { pointsForLoss: value ?? 0 })} />
      <Toggle label="Home / Away" value={stage.rules.homeAway} onChange={(value) => onRulesChange(stage.id, { homeAway: value })} />
    </div>
  );
}

function RulesPanel({ stage }: { stage: CompetitionStage }) {
  return <div className="grid gap-3 md:grid-cols-3"><Stat label="Legs" value={String(stage.rules.legs)} /><Stat label="Home / Away" value={stage.rules.homeAway ? "Yes" : "No"} /><Stat label="Points" value={stage.rules.pointsForWin + " / " + stage.rules.pointsForDraw + " / " + stage.rules.pointsForLoss} /></div>;
}

function SchedulePanel({ stage, onChange }: { stage: CompetitionStage; onChange: (id: number, patch: Partial<CompetitionStage["schedule"]>) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Start" value={stage.schedule.startDate} onChange={(value) => onChange(stage.id, { startDate: value })} />
      <Field label="End" value={stage.schedule.endDate} onChange={(value) => onChange(stage.id, { endDate: value })} />
      <NumberInput label="Interval (days)" value={stage.schedule.intervalDays} onChange={(value) => onChange(stage.id, { intervalDays: value ?? 7 })} />
      <Toggle label="Home / Away Balanced" value={stage.schedule.homeAwayBalanced} onChange={(value) => onChange(stage.id, { homeAwayBalanced: value })} />
    </div>
  );
}

function StandingPanel({ stage, onChange }: { stage: CompetitionStage; onChange: (id: number, patch: Partial<CompetitionStage["standing"]>) => void }) {
  return (
    <Field
      label="Tiebreakers (comma separated)"
      value={stage.standing.tiebreakers.join(", ")}
      onChange={(value) =>
        onChange(stage.id, {
          tiebreakers: value.split(",").map((item) => item.trim()).filter(Boolean),
        })
      }
    />
  );
}

function QualificationPanel({ stage, onChange }: { stage: CompetitionStage; onChange: (id: number, qualification: CompetitionStage["qualification"]) => void }) {
  return (
    <div className="space-y-3">
      {stage.qualification.map((rule, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-4">
          <NumberInput label="From" value={rule.positionFrom} onChange={(value) => {
            const next = [...stage.qualification];
            next[index] = { ...rule, positionFrom: value ?? rule.positionFrom };
            onChange(stage.id, next);
          }} />
          <NumberInput label="To" value={rule.positionTo} onChange={(value) => {
            const next = [...stage.qualification];
            next[index] = { ...rule, positionTo: value ?? rule.positionTo };
            onChange(stage.id, next);
          }} />
          <SelectField label="Type" value={rule.type} options={["QUALIFY", "PROMOTE", "RELEGATE"]} onChange={(value) => {
            const next = [...stage.qualification];
            next[index] = { ...rule, type: value as typeof rule.type };
            onChange(stage.id, next);
          }} />
          <NumberInput label="Destination Competition ID" value={rule.destinationCompetitionId} onChange={(value) => {
            const next = [...stage.qualification];
            next[index] = { ...rule, destinationCompetitionId: value };
            onChange(stage.id, next);
          }} />
        </div>
      ))}
    </div>
  );
}

function DrawPanel({ stage, onChange }: { stage: CompetitionStage; onChange: (id: number, patch: Partial<CompetitionStage["draw"]>) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <SelectField label="Draw Type" value={stage.draw.type} options={["NONE", "RANDOM", "SEEDED"]} onChange={(value) => onChange(stage.id, { type: value as CompetitionStage["draw"]["type"] })} />
      <NumberInput label="Seed Count" value={stage.draw.seedCount} onChange={(value) => onChange(stage.id, { seedCount: value ?? 0 })} />
      <SelectField label="Order Mode" value={stage.draw.orderMode} options={["RANDOM", "SEEDED"]} onChange={(value) => onChange(stage.id, { orderMode: value as CompetitionStage["draw"]["orderMode"] })} />
    </div>
  );
}

function HistoryTab({ seasons }: { seasons: CompetitionSeason[] }) {
  return <div className="space-y-3">{seasons.map((season) => <div key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{season.year}</span><span className="text-xs text-slate-500">{season.status}</span></div><div className="mt-2 text-xs text-slate-600">{season.startDate} → {season.endDate}</div></div>)}</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  return <label className="space-y-2"><span className="block text-xs font-medium text-slate-400">{label}</span><input value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" /></label>;
}

function NumberInput({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  return <Field label={label} value={value === undefined ? "" : String(value)} onChange={(value) => onChange(value === "" ? undefined : Number(value))} />;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</div><div className="mt-2 text-sm text-slate-300">{value}</div></div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-600">{message}</div>;
}
