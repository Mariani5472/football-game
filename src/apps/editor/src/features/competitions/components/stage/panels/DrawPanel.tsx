import { useState } from "react";
import { createFourPots, randomDraw, conditionalDraw } from "../../../draws";
import type { DrawRestriction, DrawTeam } from "../../../draws";
import type { CompetitionStage } from "../../../types";
import { NumberInput, SelectField, Stat, Toggle } from "../../editor/shared";

export function DrawPanel({ stage }: { stage: CompetitionStage }) {
  const [drawType, setDrawType] = useState(stage.draw.drawType);
  const [groupCount, setGroupCount] = useState(stage.draw.groupCount);
  const [teamsPerGroup, setTeamsPerGroup] = useState(stage.draw.teamsPerGroup);
  const [sameNation, setSameNation] = useState(false);
  const [sameGroup, setSameGroup] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof randomDraw>>();

  const teams: DrawTeam[] = stage.participants.map((teamId, index) => ({
    teamId,
    seed: seeded ? index + 1 : undefined,
  }));

  function draw() {
    const restrictions: DrawRestriction[] = [];

    if (sameNation) {
      restrictions.push({
        id: 1,
        drawId: stage.draw.definitionId ?? 0,
        type: "SAME_NATION",
        sameGroupAllowed: false,
      });
    }

    if (sameGroup) {
      restrictions.push({
        id: 2,
        drawId: stage.draw.definitionId ?? 0,
        type: "SAME_GROUP",
        sameGroupAllowed: false,
      });
    }

    const next =
      drawType === "RANDOM"
        ? randomDraw(teams, groupCount, teamsPerGroup)
        : conditionalDraw(teams, {
            groupCount,
            teamsPerGroup,
            restrictions,
          });

    setResult(next);
  }

  const pots =
    seeded && teams.length === 16
      ? createFourPots(stage.draw.definitionId ?? 0, stage.participants)
      : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <SelectField
          label="Draw Type"
          value={drawType}
          options={["RANDOM", "SEEDED", "CONDITIONAL"]}
          onChange={(value) =>
            setDrawType(value as CompetitionStage["draw"]["drawType"])
          }
        />
        <NumberInput label="Groups" value={groupCount} onChange={(value) => setGroupCount(value ?? 4)} />
        <NumberInput label="Teams / Group" value={teamsPerGroup} onChange={(value) => setTeamsPerGroup(value ?? 4)} />
        <NumberInput label="Seed Count" value={stage.draw.seedCount} onChange={() => undefined} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Toggle label="Seeded Teams" value={seeded || drawType === "SEEDED"} onChange={setSeeded} />
        <Toggle label="Cannot draw same nation" value={sameNation} onChange={setSameNation} />
        <Toggle label="Cannot draw same group" value={sameGroup} onChange={setSameGroup} />
      </div>

      {pots.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {pots.map((pot) => (
            <div key={pot.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-slate-200">{pot.name}</div>
              <div className="mt-2 text-xs text-slate-500">{pot.teamIds.length} teams</div>
              <div className="mt-3 space-y-1">
                {pot.teamIds.map((teamId) => (
                  <div key={teamId} className="rounded-lg bg-white/[0.03] px-2 py-1 text-xs text-slate-400">
                    Team #{teamId}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <div className="text-sm font-medium text-slate-200">{groupCount} groups × {teamsPerGroup} teams</div>
          <div className="mt-1 text-xs text-slate-500">Generate a draw using the current stage participants.</div>
        </div>
        <button type="button" onClick={draw} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300">
          Run Draw
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <Stat label="Assigned Teams" value={String(result.assignments.size)} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {result.groups.map((group) => (
              <div key={group.number} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-medium text-slate-200">Group {group.number}</div>
                <div className="mt-3 space-y-1">
                  {group.teamIds.map((teamId) => (
                    <div key={teamId} className="rounded-lg bg-white/[0.03] px-2 py-1 text-xs text-slate-400">
                      Team #{teamId}
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
