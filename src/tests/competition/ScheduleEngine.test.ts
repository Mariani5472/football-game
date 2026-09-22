import assert from "node:assert/strict";
import test from "node:test";
import { ScheduleEngine } from "../../modules/competition/engine/ScheduleEngine.js";

const participants = Array.from({ length: 20 }, (_, index) => ({
  teamId: index + 1,
  name: `Team ${index + 1}`,
  shortName: `TM${index}`
}),);

test("gera temporada double round-robin", () => {
  const engine = new ScheduleEngine();
  const rounds = engine.generateDoubleRoundRobin(participants);

  assert.equal(rounds.length, 38,);
  const fixtures = rounds.flatMap((round) => round.fixtures,);
  assert.equal(fixtures.length, 380,);
},);

test("cada time joga exatamente uma vez por rodada", () => {

  const rounds = new ScheduleEngine().generateDoubleRoundRobin(
    participants,
  );

  for (const round of rounds) {
    const appearances = new Set<number>();

    for (const fixture of round.fixtures) {
      assert.equal(appearances.has(fixture.homeTeamId,), false,);
      assert.equal(appearances.has(fixture.awayTeamId,), false,);

      appearances.add(fixture.homeTeamId,);
      appearances.add(fixture.awayTeamId,);
    }

    assert.equal(appearances.size, 20,);
  }
},);

test("cada par de times se enfrenta duas vezes", () => {
  const rounds = new ScheduleEngine().generateDoubleRoundRobin(
    participants,
  );

  const pairCount = new Map<string, number>();

  for (const round of rounds) {
    for (const fixture of round.fixtures) {
      const ids = [fixture.homeTeamId, fixture.awayTeamId,].sort(
        (a, b) => a - b,
      );

      const key = `${ids[0]}-${ids[1]}`;
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1,);
    }
  }

  for (const count of pairCount.values()) {
    assert.equal(count, 2,);
  }

  assert.equal(pairCount.size, 190,);
},
);