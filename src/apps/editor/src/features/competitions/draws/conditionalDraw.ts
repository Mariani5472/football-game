import type {
  DrawGroup,
  DrawRestriction,
  DrawResult,
  DrawTeam,
} from "./types";
import { canDrawTeam, type DrawState } from "./restrictions";

export interface ConditionalDrawOptions {
  groupCount: number;
  teamsPerGroup: number;
  restrictions: DrawRestriction[];
  random?: () => number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

export function conditionalDraw(
  teams: DrawTeam[],
  options: ConditionalDrawOptions,
): DrawResult {
  const random = options.random ?? Math.random;
  const { groupCount, teamsPerGroup, restrictions } = options;

  if (teams.length !== groupCount * teamsPerGroup) {
    throw new Error("Team count must match group count multiplied by teams per group.");
  }

  const groups: DrawGroup[] = Array.from({ length: groupCount }, (_, index) => ({
    number: index + 1,
    teamIds: [],
  }));

  const assignments = new Map<number, number>();
  const allTeams = new Map(teams.map((team) => [team.teamId, team]));
  const state: DrawState = { groups, assignments };

  const orderedTeams = [...teams].sort((a, b) => {
    const aSeed = a.seed ?? Number.MAX_SAFE_INTEGER;
    const bSeed = b.seed ?? Number.MAX_SAFE_INTEGER;
    return aSeed - bSeed;
  });

  function place(index: number): boolean {
    if (index >= orderedTeams.length) return true;

    const team = orderedTeams[index];
    const groupNumbers = shuffle(
      groups
        .filter((group) => group.teamIds.length < teamsPerGroup)
        .map((group) => group.number),
      random,
    );

    for (const groupNumber of groupNumbers) {
      if (!canDrawTeam(team, groupNumber, state, restrictions, allTeams)) {
        continue;
      }

      const group = groups.find((item) => item.number === groupNumber);
      if (!group) continue;

      group.teamIds.push(team.teamId);
      assignments.set(team.teamId, groupNumber);

      if (place(index + 1)) return true;

      group.teamIds.pop();
      assignments.delete(team.teamId);
    }

    return false;
  }

  if (!place(0)) {
    throw new Error("No valid conditional draw could be found with the configured restrictions.");
  }

  return { groups, assignments };
}
