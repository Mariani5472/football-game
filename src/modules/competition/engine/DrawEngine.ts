import type { DrawGroup, DrawRestriction, DrawResult, DrawTeam } from "../domain/Draw.js";

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function canDraw(team: DrawTeam, groupNumber: number, groups: DrawGroup[], restrictions: DrawRestriction[], allTeams: Map<number, DrawTeam>): boolean {
  const group = groups.find(item => item.number === groupNumber);
  if (!group) return false;

  for (const restriction of restrictions) {
    if (restriction.type === "SEEDING") continue;
    if (restriction.type === "SAME_NATION" && !restriction.sameGroupAllowed && team.nationId != null) {
      if (group.teamIds.some(teamId => allTeams.get(teamId)?.nationId === team.nationId)) return false;
    }
  }
  return true;
}

export function randomDraw(teams: DrawTeam[], groupCount: number, teamsPerGroup: number, random: () => number = Math.random): DrawResult {
  if (groupCount < 1 || teamsPerGroup < 1 || teams.length !== groupCount * teamsPerGroup) {
    throw new Error("Draw configuration does not match participant count.");
  }
  const groups = Array.from({ length: groupCount }, (_, index) => ({ number: index + 1, teamIds: [] as number[] }));
  const assignments = new Map<number, number>();
  for (const [index, team] of shuffle(teams, random).entries()) {
    const group = groups[Math.floor(index / teamsPerGroup)];
    group.teamIds.push(team.teamId);
    assignments.set(team.teamId, group.number);
  }
  return { groups, assignments };
}

export function conditionalDraw(teams: DrawTeam[], options: { groupCount: number; teamsPerGroup: number; restrictions: DrawRestriction[]; random?: () => number }): DrawResult {
  if (teams.length !== options.groupCount * options.teamsPerGroup) {
    throw new Error("Team count must match group count multiplied by teams per group.");
  }
  const random = options.random ?? Math.random;
  const groups = Array.from({ length: options.groupCount }, (_, index) => ({ number: index + 1, teamIds: [] as number[] }));
  const assignments = new Map<number, number>();
  const allTeams = new Map(teams.map(team => [team.teamId, team]));
  const ordered = [...teams].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));

  const place = (index: number): boolean => {
    if (index >= ordered.length) return true;
    const team = ordered[index];
    const candidates = shuffle(groups.filter(group => group.teamIds.length < options.teamsPerGroup).map(group => group.number), random);
    for (const groupNumber of candidates) {
      if (!canDraw(team, groupNumber, groups, options.restrictions, allTeams)) continue;
      const group = groups.find(item => item.number === groupNumber)!;
      group.teamIds.push(team.teamId);
      assignments.set(team.teamId, groupNumber);
      if (place(index + 1)) return true;
      group.teamIds.pop();
      assignments.delete(team.teamId);
    }
    return false;
  };

  if (!place(0)) throw new Error("No valid conditional draw could be found with the configured restrictions.");
  return { groups, assignments };
}