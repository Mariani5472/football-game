import { describe, expect, it } from "vitest";
import { conditionalDraw, seededDraw } from "./DrawEngine.js";
import type { DrawTeam } from "../domain/Draw.js";

const teams: DrawTeam[] = Array.from({ length: 8 }, (_, index) => ({
  teamId: index + 1,
  nationId: index % 2,
  seed: index + 1,
}));

describe("DrawEngine", () => {
  it("creates deterministic seeded groups", () => {
    const result = seededDraw(teams, {
      groupCount: 2,
      teamsPerGroup: 4,
      random: () => 0,
    });

    expect(result.groups.map((group) => group.teamIds)).toEqual([
      [1, 3, 5, 7],
      [2, 4, 6, 8],
    ]);
  });

  it("respects same-nation restrictions", () => {
    const result = conditionalDraw(teams, {
      groupCount: 2,
      teamsPerGroup: 4,
      random: () => 0,
      restrictions: [
        {
          type: "SAME_NATION",
          sameGroupAllowed: false,
        },
      ],
    });

    expect(
      result.groups.every(
        (group) =>
          new Set(
            group.teamIds.map(
              (teamId) => teams.find((team) => team.teamId === teamId)?.nationId,
            ),
          ).size === 4,
      ),
    ).toBe(true);
  });

  it("fails impossible draws instead of returning an invalid assignment", () => {
    const impossible = teams.map((team) => ({ ...team, nationId: 1 }));

    expect(() =>
      conditionalDraw(impossible, {
        groupCount: 2,
        teamsPerGroup: 4,
        restrictions: [
          {
            type: "SAME_NATION",
            sameGroupAllowed: false,
          },
        ],
        random: () => 0,
      }),
    ).toThrow();
  });
});
