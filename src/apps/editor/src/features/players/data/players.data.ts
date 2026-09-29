import type { Player } from "../types";

export const players: Player[] = [
  {
    personId: 1,
    positionIds: [1],
    potential: 16,
    estimatedValue: 12000000,
    leftFoot: 18,
    rightFoot: 12,
    clubId: 1,
    contractId: 1,
    attributes: {
      technical: {
        finishing: 15,
        passing: 14,
        dribbling: 13,
        first_touch: 15,
        tackling: 8,
      },
      physical: {
        acceleration: 14,
        agility: 15,
        pace: 14,
        stamina: 16,
        strength: 12,
      },
      psychological: {
        anticipation: 14,
        composure: 13,
        decisions: 14,
        determination: 16,
        teamwork: 15,
        vision: 14,
      },
      goalkeeper: {},
    },
  },
];
