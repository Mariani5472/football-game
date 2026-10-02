import { describe, expect, it } from "vitest";
import { generateRoundRobin } from "./roundRobin";

describe("generateRoundRobin", () => {
  const teams = Array.from({ length: 20 }, (_, index) => index + 1);

  it("generates 38 rounds and 380 fixtures for 20 teams", () => {
    const result = generateRoundRobin(teams, "2026-04-04", 7);

    expect(result.valid).toBe(true);
    expect(result.schedule?.totalRounds).toBe(38);
    expect(result.schedule?.totalFixtures).toBe(380);
    expect(result.schedule?.rounds.every((round) => round.fixtures.length === 10)).toBe(true);
  });

  it("makes every pair play exactly twice with reversed home and away", () => {
    const result = generateRoundRobin(teams, "2026-04-04", 7);
    const fixtures = result.schedule?.rounds.flatMap((round) => round.fixtures) ?? [];

    const pairs = new Map<string, number>();
    const directionalPairs = new Set<string>();

    for (const fixture of fixtures) {
      const pair = [fixture.homeTeamId, fixture.awayTeamId].sort((a, b) => a - b).join("-");
      pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
      directionalPairs.add(fixture.homeTeamId + "-" + fixture.awayTeamId);
    }

    expect(pairs.size).toBe(190);
    expect([...pairs.values()].every((count) => count === 2)).toBe(true);
    expect(directionalPairs.size).toBe(380);
  });

  it("never schedules a team twice in the same round", () => {
    const result = generateRoundRobin(teams, "2026-04-04", 7);

    for (const round of result.schedule?.rounds ?? []) {
      const participants = round.fixtures.flatMap((fixture) => [
        fixture.homeTeamId,
        fixture.awayTeamId,
      ]);

      expect(new Set(participants).size).toBe(20);
    }
  });

  it("rejects an odd number of teams for the current league scheduler", () => {
    const result = generateRoundRobin([1, 2, 3], "2026-04-04", 7);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Round-robin currently requires an even number of teams.",
    );
  });
});
