import type { DrawPot, DrawTeam } from "./types";

export interface PotDefinition {
  id: number;
  name: string;
  potOrder: number;
  teamIds: number[];
}

export function createPots(
  drawId: number,
  definitions: PotDefinition[],
  teams: DrawTeam[],
): DrawPot[] {
  const available = new Set(teams.map((team) => team.teamId));

  return definitions
    .sort((a, b) => a.potOrder - b.potOrder)
    .map((definition) => {
      const uniqueTeams = [...new Set(definition.teamIds)];

      if (uniqueTeams.some((teamId) => !available.has(teamId))) {
        throw new Error("Pot " + definition.name + " contains an unknown team.");
      }

      return {
        id: definition.id,
        drawId,
        name: definition.name,
        potOrder: definition.potOrder,
        teamIds: uniqueTeams,
      };
    });
}
