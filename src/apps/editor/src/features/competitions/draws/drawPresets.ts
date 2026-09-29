import type { DrawDefinition, DrawPot, DrawRestriction, DrawTeam } from "./types";

export const SIMPLE_GROUP_DRAW: Omit<DrawDefinition, "id" | "stageId"> = {
  name: "4 Groups",
  drawType: "RANDOM",
  groupCount: 4,
  teamsPerGroup: 4,
  seedCount: 0,
  orderMode: "RANDOM",
};

export function createSimpleGroupTeams(): DrawTeam[] {
  return Array.from({ length: 16 }, (_, index) => ({
    teamId: index + 1,
  }));
}

export function createFourPots(drawId: number, teamIds: number[]): DrawPot[] {
  if (teamIds.length !== 16) {
    throw new Error("The simple 4x4 example requires exactly 16 teams.");
  }

  return Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    drawId,
    name: "Pot " + (index + 1),
    potOrder: index + 1,
    teamIds: teamIds.slice(index * 4, index * 4 + 4),
  }));
}

export const sameNationRestriction: DrawRestriction = {
  id: 1,
  drawId: 1,
  type: "SAME_NATION",
  sameGroupAllowed: false,
};

export const sameGroupRestriction: DrawRestriction = {
  id: 2,
  drawId: 1,
  type: "SAME_GROUP",
  sameGroupAllowed: false,
};
