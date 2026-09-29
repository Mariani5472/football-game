import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, CircleAlert } from "lucide-react";

import { EntityForm, EntityPicker, Tabs } from "../../../shared/components";
import { teams } from "../../teams/data/teams.data";
import { countries } from "../../world/data/world.data";
import { useCompetitionEditor } from "../hooks/useCompetitionEditor";
import {
  LEAGUE_MATCHES_PER_ROUND,
  LEAGUE_ROUNDS,
  LEAGUE_TEAM_COUNT,
  LEAGUE_TOTAL_MATCHES,
  LEAGUE_TOTAL_ROUNDS,
  validateSimpleLeague,
} from "../rules/league";
import type {
  Competition,
  CompetitionSeason,
  CompetitionStage,
  StandingRule,
  StandingRuleType,
} from "../types";

interface CompetitionEditorProps {
  competition?: Competition;
  onBack: () => void;
}

export function CompetitionEditor({
  competition,
  onBack,
}: CompetitionEditorProps) {
  const editor = useCompetitionEditor(competition);
  const [activeTab, setActiveTab] = useState<
    "general" | "seasons" | "teams" | "stages" | "history"
  >("general");
  const season = editor.draft.seasons[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            COMPETITIONS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {editor.draft.name || "New Competition"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Define the competition, seasons, participants and competition rules.
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

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "general",
            label: "General",
            content: <GeneralTab editor={editor} />,
          },
          {
            id: "seasons",
            label: "Seasons",
            content: (
              <SeasonsTab
                seasons={editor.draft.seasons}
                onChange={editor.updateSeason}
              />
            ),
          },
          {
            id: "teams",
            label: "Teams",
            content: (
              <TeamsTab season={season} onChange={editor.updateSeason} />
            ),
          },
          {
            id: "stages",
            label: "Stages",
            content: (
              <StagesTab
                season={season}
                onChange={editor.updateStage}
                onParticipantRuleChange={editor.updateStageParticipantRule}
                onFormatChange={editor.updateStageFormatRule}
                onPointsChange={editor.updateStagePointsRule}
                onStandingChange={editor.updateStageStandingRules}
              />
            ),
          },
          {
            id: "history",
            label: "History",
            content: <HistoryTab seasons={editor.draft.seasons} />,
          },
        ]}
      />
    </div>
  );
}

function GeneralTab({
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
          if (
            name === "name" ||
            name === "shortName" ||
            name === "type"
          ) {
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
          options={countries.map((country) => ({
            id: country.id,
            label: country.name,
          }))}
          onChange={(value) =>
            editor.setCompetitionValue("countryId", Number(value))
          }
        />
        <NumberInput
          label="Level"
          value={editor.draft.level}
          onChange={(value) => editor.setCompetitionValue("level", value)}
        />
        <NumberInput
          label="Reputation"
          value={editor.draft.reputation}
          onChange={(value) =>
            editor.setCompetitionValue("reputation", value)
          }
        />
      </div>
    </section>
  );
}

function SeasonsTab({
  seasons,
  onChange,
}: {
  seasons: CompetitionSeason[];
  onChange: (
    id: number,
    patch: Partial<CompetitionSeason>,
  ) => void;
}) {
  return (
    <div className="space-y-3">
      {seasons.map((season) => (
        <div
          key={season.id}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        >
          <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr_160px]">
            <NumberInput
              label="Year"
              value={season.year}
              onChange={(value) =>
                onChange(season.id, { year: value ?? season.year })
              }
            />
            <Field
              label="Start"
              value={season.startDate}
              onChange={(value) =>
                onChange(season.id, { startDate: value })
              }
            />
            <Field
              label="End"
              value={season.endDate}
              onChange={(value) =>
                onChange(season.id, { endDate: value })
              }
            />
            <label className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">
                Status
              </span>
              <select
                value={season.status}
                onChange={(event) =>
                  onChange(season.id, {
                    status:
                      event.target.value as CompetitionSeason["status"],
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsTab({
  season,
  onChange,
}: {
  season?: CompetitionSeason;
  onChange: (
    id: number,
    patch: Partial<CompetitionSeason>,
  ) => void;
}) {
  if (!season) {
    return <Empty message="Create a season before assigning teams." />;
  }

  const selected = new Set(season.teams);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-5">
        <div className="text-sm font-medium text-slate-200">
          Season Participants
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {season.teams.length} teams selected
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <label
            key={team.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"
          >
            <input
              type="checkbox"
              checked={selected.has(team.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...season.teams, team.id]
                  : season.teams.filter((id) => id !== team.id);

                onChange(season.id, { teams: next });
              }}
            />
            {team.name}
          </label>
        ))}
      </div>
    </section>
  );
}

function StagesTab({
  season,
  onChange,
  onParticipantRuleChange,
  onFormatChange,
  onPointsChange,
  onStandingChange,
}: {
  season?: CompetitionSeason;
  onChange: (
    id: number,
    patch: Partial<CompetitionStage>,
  ) => void;
  onParticipantRuleChange: (
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) => void;
  onFormatChange: (
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) => void;
  onPointsChange: (
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) => void;
  onStandingChange: (
    id: number,
    standingRules: CompetitionStage["standingRules"],
  ) => void;
}) {
  if (!season) {
    return <Empty message="Create a season before configuring stages." />;
  }

  return (
    <div className="space-y-4">
      {season.stages.map((stage) => (
        <StageCard
          key={stage.id}
          stage={stage}
          seasonTeams={season.teams}
          onChange={onChange}
          onParticipantRuleChange={onParticipantRuleChange}
          onFormatChange={onFormatChange}
          onPointsChange={onPointsChange}
          onStandingChange={onStandingChange}
        />
      ))}
    </div>
  );
}

function StageCard({
  stage,
  seasonTeams,
  onChange,
  onParticipantRuleChange,
  onFormatChange,
  onPointsChange,
  onStandingChange,
}: {
  stage: CompetitionStage;
  seasonTeams: number[];
  onChange: (
    id: number,
    patch: Partial<CompetitionStage>,
  ) => void;
  onParticipantRuleChange: (
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) => void;
  onFormatChange: (
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) => void;
  onPointsChange: (
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) => void;
  onStandingChange: (
    id: number,
    standingRules: CompetitionStage["standingRules"],
  ) => void;
}) {
  const [tab, setTab] = useState<
    "participants" | "format" | "points" | "standing" | "rules"
  >("participants");

  const validation = validateSimpleLeague(stage);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 grid gap-4 md:grid-cols-[1fr_180px_120px]">
        <Field
          label="Stage Name"
          value={stage.name}
          onChange={(value) => onChange(stage.id, { name: value })}
        />

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-400">
            Format
          </span>
          <div className="flex h-[42px] items-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3 text-sm text-emerald-200">
            League
          </div>
        </div>

        <NumberInput
          label="Order"
          value={stage.stageOrder}
          onChange={(value) =>
            onChange(stage.id, {
              stageOrder: value ?? stage.stageOrder,
            })
          }
        />
      </div>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          {
            id: "participants",
            label: "Participants",
            content: (
              <ParticipantsPanel
                stage={stage}
                seasonTeams={seasonTeams}
                onChange={onChange}
                onParticipantRuleChange={onParticipantRuleChange}
              />
            ),
          },
          {
            id: "format",
            label: "Format",
            content: (
              <FormatPanel
                stage={stage}
                onChange={onFormatChange}
              />
            ),
          },
          {
            id: "points",
            label: "Points",
            content: (
              <PointsPanel
                stage={stage}
                onChange={onPointsChange}
              />
            ),
          },
          {
            id: "standing",
            label: "Standing Rules",
            content: (
              <StandingPanel
                stage={stage}
                onChange={onStandingChange}
              />
            ),
          },
          {
            id: "rules",
            label: "Rules",
            content: <RulesPanel stage={stage} validation={validation} />,
          },
        ]}
      />
    </div>
  );
}

function ParticipantsPanel({
  stage,
  seasonTeams,
  onChange,
  onParticipantRuleChange,
}: {
  stage: CompetitionStage;
  seasonTeams: number[];
  onChange: (
    id: number,
    patch: Partial<CompetitionStage>,
  ) => void;
  onParticipantRuleChange: (
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) => void;
}) {
  const selected = new Set(stage.participants);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Required Teams"
          value={String(stage.participantRule.maxParticipants)}
        />
        <Stat
          label="Selected"
          value={String(stage.participants.length)}
        />
        <Stat
          label="Status"
          value={
            stage.participants.length ===
            stage.participantRule.maxParticipants
              ? "Complete"
              : "Incomplete"
          }
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <SelectField
          label="Participant Type"
          value={stage.participantRule.participantType}
          options={["TEAM"]}
          onChange={() =>
            onParticipantRuleChange(stage.id, {
              participantType: "TEAM",
            })
          }
        />
        <NumberInput
          label="Minimum"
          value={stage.participantRule.minParticipants}
          onChange={(value) =>
            onParticipantRuleChange(stage.id, {
              minParticipants: value ?? LEAGUE_TEAM_COUNT,
            })
          }
        />
        <NumberInput
          label="Maximum"
          value={stage.participantRule.maxParticipants}
          onChange={(value) =>
            onParticipantRuleChange(stage.id, {
              maxParticipants: value ?? LEAGUE_TEAM_COUNT,
            })
          }
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        {seasonTeams.map((teamId) => (
          <label
            key={teamId}
            className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400"
          >
            <input
              type="checkbox"
              checked={selected.has(teamId)}
              onChange={(event) => {
                const participants = event.target.checked
                  ? [...stage.participants, teamId]
                  : stage.participants.filter((id) => id !== teamId);

                onChange(stage.id, { participants });
              }}
            />
            Team #{teamId}
          </label>
        ))}
      </div>
    </div>
  );
}

function FormatPanel({
  stage,
  onChange,
}: {
  stage: CompetitionStage;
  onChange: (
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Format" value="League" />
        <NumberInput
          label="Participants"
          value={stage.formatRule.participantCount}
          onChange={(value) =>
            onChange(stage.id, {
              participantCount: value ?? LEAGUE_TEAM_COUNT,
            })
          }
        />
        <NumberInput
          label="Legs"
          value={stage.formatRule.legs}
          onChange={(value) =>
            onChange(stage.id, { legs: value ?? 2 })
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Toggle
          label="Home / Away"
          value={stage.formatRule.homeAway === 1}
          onChange={(value) =>
            onChange(stage.id, { homeAway: value ? 1 : 0 })
          }
        />
        <Toggle
          label="Aggregate Score"
          value={stage.formatRule.aggregateScore === 1}
          onChange={(value) =>
            onChange(stage.id, {
              aggregateScore: value ? 1 : 0,
            })
          }
        />
        <Toggle
          label="Extra Time"
          value={stage.formatRule.extraTime === 1}
          onChange={(value) =>
            onChange(stage.id, {
              extraTime: value ? 1 : 0,
            })
          }
        />
        <Toggle
          label="Penalties"
          value={stage.formatRule.penalties === 1}
          onChange={(value) =>
            onChange(stage.id, {
              penalties: value ? 1 : 0,
            })
          }
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-500">
        A 20-team double round robin produces {LEAGUE_TOTAL_ROUNDS} rounds,
        {LEAGUE_MATCHES_PER_ROUND} matches per round and{" "}
        {LEAGUE_TOTAL_MATCHES} matches in total.
      </div>
    </div>
  );
}

function PointsPanel({
  stage,
  onChange,
}: {
  stage: CompetitionStage;
  onChange: (
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput
          label="Win"
          value={stage.pointsRule.winPoints}
          onChange={(value) =>
            onChange(stage.id, { winPoints: value ?? 3 })
          }
        />
        <NumberInput
          label="Draw"
          value={stage.pointsRule.drawPoints}
          onChange={(value) =>
            onChange(stage.id, { drawPoints: value ?? 1 })
          }
        />
        <NumberInput
          label="Loss"
          value={stage.pointsRule.lossPoints}
          onChange={(value) =>
            onChange(stage.id, { lossPoints: value ?? 0 })
          }
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
        {stage.pointsRule.winPoints} points for a win,{" "}
        {stage.pointsRule.drawPoints} for a draw and{" "}
        {stage.pointsRule.lossPoints} for a loss.
      </div>
    </div>
  );
}

function StandingPanel({
  stage,
  onChange,
}: {
  stage: CompetitionStage;
  onChange: (
    id: number,
    standingRules: CompetitionStage["standingRules"],
  ) => void;
}) {
  const rules = [...stage.standingRules].sort(
    (a, b) => a.ruleOrder - b.ruleOrder,
  );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...rules];
    const target = index + direction;

    if (target < 0 || target >= next.length) {
      return;
    }

    [next[index], next[target]] = [next[target], next[index]];
    onChange(stage.id, next);
  };

  return (
    <section className="space-y-3">
      <div>
        <div className="text-sm font-medium text-slate-200">
          Standing Rules
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Rules are evaluated from top to bottom when teams are tied.
        </div>
      </div>

      {rules.map((rule, index) => (
        <div
          key={rule.ruleType}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-semibold text-slate-400">
            {index + 1}
          </div>

          <div className="flex-1 text-sm text-slate-200">
            {standingRuleLabels[rule.ruleType]}
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move rule up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              disabled={index === rules.length - 1}
              onClick={() => move(index, 1)}
              className="rounded-lg border border-white/10 p-2 text-slate-500 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move rule down"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>
      ))}

      {rules.length === 0 && (
        <Empty message="No standing rules configured." />
      )}
    </section>
  );
}

const standingRuleLabels: Record<StandingRuleType, string> = {
  POINTS: "Points",
  GOAL_DIFFERENCE: "Goal Difference",
  GOALS_FOR: "Goals For",
  WINS: "Wins",
};

function RulesPanel({
  stage,
  validation,
}: {
  stage: CompetitionStage;
  validation: ReturnType<typeof validateSimpleLeague>;
}) {
  return (
    <div className="space-y-5">
      <div
        className={[
          "flex items-start gap-3 rounded-xl border p-4",
          validation.valid
            ? "border-emerald-400/20 bg-emerald-400/[0.04]"
            : "border-amber-400/20 bg-amber-400/[0.04]",
        ].join(" ")}
      >
        {validation.valid ? (
          <CheckCircle2
            size={18}
            className="mt-0.5 text-emerald-300"
          />
        ) : (
          <CircleAlert
            size={18}
            className="mt-0.5 text-amber-300"
          />
        )}

        <div>
          <div className="text-sm font-medium text-slate-200">
            {validation.valid
              ? "League configuration is valid"
              : "League configuration needs attention"}
          </div>

          {!validation.valid && (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Teams"
          value={String(stage.participants.length)}
        />
        <Stat
          label="Rounds"
          value={String(LEAGUE_TOTAL_ROUNDS)}
        />
        <Stat
          label="Matches"
          value={String(LEAGUE_TOTAL_MATCHES)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat
          label="Legs"
          value={String(stage.formatRule.legs)}
        />
        <Stat
          label="Home / Away"
          value={stage.formatRule.homeAway === 1 ? "Yes" : "No"}
        />
        <Stat
          label="Points"
          value={[
            stage.pointsRule.winPoints,
            stage.pointsRule.drawPoints,
            stage.pointsRule.lossPoints,
          ].join(" / ")}
        />
      </div>
    </div>
  );
}

function HistoryTab({ seasons }: { seasons: CompetitionSeason[] }) {
  return (
    <div className="space-y-3">
      {seasons.map((season) => (
        <div
          key={season.id}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {season.year}
            </span>
            <span className="text-xs text-slate-500">
              {season.status}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            {season.startDate} → {season.endDate}
          </div>
        </div>
      ))}
    </div>
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
      <span className="block text-xs font-medium text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none"
      />
    </label>
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
      onChange={(value) =>
        onChange(value === "" ? undefined : Number(value))
      }
    />
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-sm text-slate-300">{value}</div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-600">
      {message}
    </div>
  );
}
