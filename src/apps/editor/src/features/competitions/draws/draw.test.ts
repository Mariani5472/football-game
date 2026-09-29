import { describe, expect, it } from "vitest";
import { conditionalDraw } from "./conditionalDraw";
import { createFourPots, createSimpleGroupTeams } from "./drawPresets";
import { randomDraw } from "./randomDraw";

describe("draws", () => {
  it("creates four groups with four teams each", () => {
    const result = randomDraw(createSimpleGroupTeams(), 4, 4, () => 0);

    expect(result.groups).toHaveLength(4);
    expect(result.groups.every((group) => group.teamIds.length === 4)).toBe(true);
    expect(result.assignments.size).toBe(16);
  });

  it("creates four pots with four teams each", () => {
    const pots = createFourPots(1, Array.from({ length: 16 }, (_, index) => index + 1));

    expect(pots).toHaveLength(4);
    expect(pots.every((pot) => pot.teamIds.length === 4)).toBe(true);
    expect(new Set(pots.flatMap((pot) => pot.teamIds)).size).toBe(16);
  });

  it("does not place teams from the same nation in one group", () => {
    const teams = Array.from({ length: 16 }, (_, index) => ({
      teamId: index + 1,
      nationId: Math.floor(index / 4) + 1,
    }));

    const result = conditionalDraw(teams, {
      groupCount: 4,
      teamsPerGroup: 4,
      restrictions: [
        {
          id: 1,
          drawId: 1,
          type: "SAME_NATION",
          sameGroupAllowed: false,
        },
      ],
    });

    for (const group of result.groups) {
      const nations = group.teamIds.map(
        (teamId) => teams.find((team) => team.teamId === teamId)?.nationId,
      );
      expect(new Set(nations).size).toBe(4);
    }
  });
});
