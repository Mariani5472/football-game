import type { Player } from "../types";

export const players: Player[] = [
  {
    personId: 1,
    positionIds: [5],
    potential: 16,
    estimatedValue: 12000000,
    leftFoot: 18,
    rightFoot: 12,
    clubId: 1,
    contractId: 1,
    attributes: {
      technical: {
        passing: 14,
        finishing: 12,
        dribbling: 15,
      },
      physical: {
        pace: 16,
        strength: 10,
        stamina: 14,
      },
      mental: {
        vision: 15,
        decision_making: 13,
      },
      goalkeeping: {},
    },
  },
];
