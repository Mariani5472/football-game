import type { DrawGroup, DrawRestriction, DrawTeam } from "./types";

export interface DrawState {
  groups: DrawGroup[];
  assignments: Map<number, number>;
}

export function canDrawTeam(
  team: DrawTeam,
  groupNumber: number,
  state: DrawState,
  restrictions: DrawRestriction[],
  allTeams: Map<number, DrawTeam>,
): boolean {
  for (const restriction of restrictions) {
    if (restriction.type === "SEEDING" && restriction.sourcePotId !== undefined) {
      continue;
    }

    if (restriction.type === "SAME_NATION" && !restriction.sameGroupAllowed) {
      const group = state.groups.find((item) => item.number === groupNumber);
      if (!group) continue;

      const sameNation = group.teamIds.some((teamId) => {
        const current = allTeams.get(teamId);
        return current?.nationId !== undefined &&
          current.nationId === team.nationId;
      });

      if (sameNation) return false;
    }

    if (restriction.type === "SAME_GROUP" && !restriction.sameGroupAllowed) {
      const previousGroup = state.assignments.get(team.teamId);
      if (previousGroup !== undefined && previousGroup === groupNumber) {
        return false;
      }
    }
  }

  return true;
}
