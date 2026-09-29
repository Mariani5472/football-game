import type { DrawGroup, DrawResult, DrawTeam } from "./types";

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

export function randomDraw(
  teams: DrawTeam[],
  groupCount: number,
  teamsPerGroup: number,
  random: () => number = Math.random,
): DrawResult {
  if (groupCount < 1 || teamsPerGroup < 1) {
    throw new Error("Draw requires at least one group and one team per group.");
  }

  const expectedTeams = groupCount * teamsPerGroup;

  if (teams.length !== expectedTeams) {
    throw new Error(
      "Draw requires exactly " + expectedTeams + " teams for " +
      groupCount + " groups of " + teamsPerGroup + ".",
    );
  }

  const shuffled = shuffle(teams, random);
  const groups: DrawGroup[] = [];
  const assignments = new Map<number, number>();

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const groupNumber = groupIndex + 1;
    const start = groupIndex * teamsPerGroup;
    const groupTeams = shuffled
      .slice(start, start + teamsPerGroup)
      .map((team) => team.teamId);

    groups.push({
      number: groupNumber,
      teamIds: groupTeams,
    });

    groupTeams.forEach((teamId) => assignments.set(teamId, groupNumber));
  }

  return { groups, assignments };
}
