import { describe, expect, it } from "vitest";

import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import {
  CompetitionEngine,
} from "../../src/modules/competition/engine/CompetitionEngine.js";
import {
  CompetitionRepository,
} from "../../src/modules/competition/repository/CompetitionRepository.js";
import {
  FastStartService,
} from "../../src/world/services/FastStartService.js";

describe("CompetitionEngine + WorldDatabase", () => {
  it("loads the Brazil Sandbox, generates 380 fixtures and simulates the season", () => {
    const database =
      WorldDatabase.create(":memory:");

    try {
      new FastStartService(database).run({
        template: "BRAZIL",
        seasonYear: 2026,
      });

      const repository =
        new CompetitionRepository(database);

      const competition =
        repository.findByName("Brasileirão");

      expect(competition).not.toBeNull();

      const season =
        repository.findSeason(
          competition!.id,
          2026,
        );

      expect(season).not.toBeNull();

      const participants =
        repository.findParticipants(
          season!.id,
        );

      expect(participants).toHaveLength(20);

      const engine =
        new CompetitionEngine(database);

      const generated =
        engine.generateSeason({
          competitionSeasonId:
            season!.id,
        });

      expect(generated.rounds).toBe(38);
      expect(generated.fixtures).toHaveLength(380);

      const pairs = new Set(
        generated.fixtures.map(
          (fixture) =>
            `${fixture.homeTeamId}-${fixture.awayTeamId}`,
        ),
      );

      expect(pairs.size).toBe(380);

      const simulation =
        engine.simulateSeason(
          generated,
          2026,
        );

      expect(
        simulation.fixturesPlayed,
      ).toBe(380);

      expect(
        simulation.standings,
      ).toHaveLength(20);

      expect(
        simulation.standings.every(
          (standing) =>
            standing.played === 38,
        ),
      ).toBe(true);
    } finally {
      database.close();
    }
  });
});
