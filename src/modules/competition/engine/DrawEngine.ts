import type { DrawGroup, DrawRestriction, DrawResult, DrawTeam } from "../domain/Draw.js";

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export interface DrawPotInput {
  id: number;
  teamIds: number[];
  potOrder: number;
}

export interface DrawOptions {
  groupCount: number;
  teamsPerGroup: number;
  restrictions?: DrawRestriction[];
  pots?: DrawPotInput[];
  random?: () => number;
}

export function randomDraw(
  teams: DrawTeam[],
  groupCount: number,
  teamsPerGroup: number,
  random: () => number = Math.random,
): DrawResult {
  validateDrawSize(teams, groupCount, teamsPerGroup);
  const groups = createGroups(groupCount);
  const assignments = new Map<number, number>();

  for (const [index, team] of shuffle(teams, random).entries()) {
    const group = groups[Math.floor(index / teamsPerGroup)];
    group.teamIds.push(team.teamId);
    assignments.set(team.teamId, group.number);
  }

  return { groups, assignments };
}

export function seededDraw(
  teams: DrawTeam[],
  options: DrawOptions,
): DrawResult {
  validateDrawSize(teams, options.groupCount, options.teamsPerGroup);
  const groups = createGroups(options.groupCount);
  const assignments = new Map<number, number>();
  const ordered = [...teams].sort(
    (left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER),
  );

  ordered.forEach((team, index) => {
    const group = groups[index % groups.length];
    if (group.teamIds.length >= options.teamsPerGroup) {
      throw new Error("Seeded draw produced an invalid group capacity.");
    }
    group.teamIds.push(team.teamId);
    assignments.set(team.teamId, group.number);
  });

  return { groups, assignments };
}

export function conditionalDraw(
  teams: DrawTeam[],
  options: DrawOptions,
): DrawResult {
  const restrictions = options.restrictions ?? [];
  const random = options.random ?? Math.random;
  validateDrawSize(teams, options.groupCount, options.teamsPerGroup);

  const groups = createGroups(options.groupCount);
  const assignments = new Map<number, number>();
  const allTeams = new Map(teams.map((team) => [team.teamId, team]));
  const ordered = orderTeamsByPots(teams, options.pots, random);

  const place = (index: number): boolean => {
    if (index >= ordered.length) return true;

    const team = ordered[index];
    const candidates = shuffle(
      groups
        .filter((group) => group.teamIds.length < options.teamsPerGroup)
        .map((group) => group.number),
      random,
    );

    for (const groupNumber of candidates) {
      if (!canDraw(team, groupNumber, groups, assignments, restrictions, allTeams)) continue;

      const group = groups.find((item) => item.number === groupNumber);
      if (!group) continue;

      group.teamIds.push(team.teamId);
      assignments.set(team.teamId, groupNumber);

      if (place(index + 1)) return true;

      group.teamIds.pop();
      assignments.delete(team.teamId);
    }

    return false;
  };

  if (!place(0)) {
    throw new Error("No valid conditional draw could be found with the configured restrictions.");
  }

  return { groups, assignments };
}

function orderTeamsByPots(
  teams: DrawTeam[],
  pots: DrawPotInput[] | undefined,
  random: () => number,
): DrawTeam[] {
  if (!pots?.length) {
    return [...teams].sort(
      (left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER),
    );
  }

  const teamById = new Map(teams.map((team) => [team.teamId, team]));
  const ordered: DrawTeam[] = [];

  for (const pot of [...pots].sort((left, right) => left.potOrder - right.potOrder)) {
    for (const teamId of shuffle([...pot.teamIds], random)) {
      const team = teamById.get(teamId);
      if (team) ordered.push(team);
    }
  }

  return ordered;
}

function canDraw(
  team: DrawTeam,
  groupNumber: number,
  groups: DrawGroup[],
  assignments: Map<number, number>,
  restrictions: DrawRestriction[],
  allTeams: Map<number, DrawTeam>,
): boolean {
  const group = groups.find((item) => item.number === groupNumber);
  if (!group) return false;

  for (const restriction of restrictions) {
    switch (restriction.type) {
      case "SAME_NATION":
        if (!restriction.sameGroupAllowed && team.nationId != null) {
          const sameNation = group.teamIds.some(
            (teamId) => allTeams.get(teamId)?.nationId === team.nationId,
          );
          if (sameNation) return false;
        }
        break;
      case "SAME_GROUP":
        if (!restriction.sameGroupAllowed) {
          const previousGroup = assignments.get(team.teamId);
          if (previousGroup === groupNumber) return false;
        }
        break;
      case "SEEDING":
        break;
    }
  }

  return true;
}

function createGroups(groupCount: number): DrawGroup[] {
  return Array.from({ length: groupCount }, (_, index) => ({
    number: index + 1,
    teamIds: [],
  }));
}

function validateDrawSize(
  teams: DrawTeam[],
  groupCount: number,
  teamsPerGroup: number,
): void {
  if (!Number.isInteger(groupCount) || groupCount < 1) {
    throw new Error("Group count must be a positive integer.");
  }
  if (!Number.isInteger(teamsPerGroup) || teamsPerGroup < 1) {
    throw new Error("Teams per group must be a positive integer.");
  }
  if (teams.length !== groupCount * teamsPerGroup) {
    throw new Error("Team count must match group count multiplied by teams per group.");
  }
}
