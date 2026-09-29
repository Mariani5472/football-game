import { describe, expect, it } from "vitest";
import { conditionalDraw } from "./conditionalDraw";

describe("conditionalDraw", () => {
  it("rejects an impossible same-nation draw", () => {
    const teams = Array.from({ length: 16 }, (_, index) => ({
      teamId: index + 1,
      nationId: 1,
    }));

    expect(() =>
      conditionalDraw(teams, {
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
      }),
    ).toThrow(
      "No valid conditional draw could be found with the configured restrictions.",
    );
  });

  it("keeps a seeded team order deterministic when a random function is supplied", () => {
    const teams = Array.from({ length: 16 }, (_, index) => ({
      teamId: index + 1,
      seed: index + 1,
    }));

    const result = conditionalDraw(teams, {
      groupCount: 4,
      teamsPerGroup: 4,
      restrictions: [],
      random: () => 0,
    });

    expect(result.groups.map((group) => group.teamIds.length)).toEqual([
      4,
      4,
      4,
      4,
    ]);
    expect(result.assignments.size).toBe(16);
  });
});
