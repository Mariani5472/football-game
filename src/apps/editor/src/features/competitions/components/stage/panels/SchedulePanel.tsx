import { useState } from "react";
import { generateRoundRobin } from "../../../scheduling";
import type { RoundRobinSchedule } from "../../../scheduling";
import type { CompetitionStage } from "../../../types";
import { NumberInput, Stat, Toggle } from "../../editor/shared";

export function SchedulePanel({
  stage,
  onChange,
}: {
  stage: CompetitionStage;
  onChange: (id: number, patch: Partial<CompetitionStage>) => void;
}) {
  const [generated, setGenerated] = useState<RoundRobinSchedule | undefined>();

  const updateSchedule = (
    patch: Partial<CompetitionStage["schedule"]>,
  ) => {
    onChange(stage.id, {
      schedule: {
        ...stage.schedule,
        ...patch,
      },
    });
    setGenerated(undefined);
  };

  const generate = () => {
    const result = generateRoundRobin(
      stage.participants,
      stage.schedule.startDate,
      stage.schedule.intervalDays,
    );

    if (result.valid) {
      setGenerated(result.schedule);
    } else {
      setGenerated(undefined);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Scheduling Type" value="Round Robin" />
        <NumberInput
          label="Interval (days)"
          value={stage.schedule.intervalDays}
          onChange={(value) =>
            updateSchedule({ intervalDays: value ?? 7 })
          }
        />
        <DateField
          label="Start"
          value={stage.schedule.startDate}
          onChange={(value) => updateSchedule({ startDate: value })}
        />
        <DateField
          label="End"
          value={stage.schedule.endDate}
          onChange={(value) => updateSchedule({ endDate: value })}
        />
      </div>

      <Toggle
        label="Home / Away Balanced"
        value={stage.schedule.homeAwayBalanced}
        onChange={(value) => updateSchedule({ homeAwayBalanced: value })}
      />

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Round-robin schedule
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Generate all rounds from the current stage participants.
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          Generate Schedule
        </button>
      </div>

      {generated && (
        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Rounds" value={String(generated.totalRounds)} />
            <Stat label="Matches" value={String(generated.totalFixtures)} />
            <Stat
              label="Matches / Round"
              value={String(generated.rounds[0]?.fixtures.length ?? 0)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            {generated.rounds.map((round) => (
              <div
                key={round.roundNumber}
                className="border-b border-white/10 p-4 last:border-b-0"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    Round {round.roundNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    {round.date}
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {round.fixtures.map((fixture) => (
                    <div
                      key={
                        fixture.homeTeamId +
                        "-" +
                        fixture.awayTeamId
                      }
                      className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-400"
                    >
                      <span className="text-slate-200">
                        Team #{fixture.homeTeamId}
                      </span>
                      <span className="mx-2 text-slate-600">vs</span>
                      <span className="text-slate-200">
                        Team #{fixture.awayTeamId}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none"
      />
    </label>
  );
}
