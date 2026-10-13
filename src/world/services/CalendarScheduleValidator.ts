export interface CalendarFixture {
  fixtureId?: number;
  competitionSeasonId?: number;
  stageId?: number;
  roundNumber: number;
  scheduledAt: string;
  homeTeamId: number;
  awayTeamId: number;
}

export interface CalendarConflict {
  code: "INVALID_DATE" | "INVALID_PARTICIPANTS" | "SELF_FIXTURE" | "TEAM_DOUBLE_BOOKED" | "DUPLICATE_FIXTURE";
  message: string;
  fixtureIds: number[];
  teamId?: number;
  date?: string;
}

export interface CalendarValidationResult {
  valid: boolean;
  conflicts: CalendarConflict[];
}

/**
 * Validates a batch of proposed fixtures against itself and fixtures already
 * present in the world. This is deliberately side-effect free so generation
 * can fail before writing partial rounds to the database.
 */
export class CalendarScheduleValidator {
  validate(
    proposedFixtures: CalendarFixture[],
    existingFixtures: CalendarFixture[] = [],
  ): CalendarValidationResult {
    const conflicts: CalendarConflict[] = [];
    const allFixtures = [
      ...existingFixtures.map((fixture) => ({ ...fixture, existing: true })),
      ...proposedFixtures.map((fixture) => ({ ...fixture, existing: false })),
    ];

    const validDate = (value: string): boolean => {
      if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return false;
      const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
    };

    for (const fixture of proposedFixtures) {
      const ids = fixture.fixtureId == null ? [] : [fixture.fixtureId];
      if (!validDate(fixture.scheduledAt)) {
        conflicts.push({
          code: "INVALID_DATE",
          message: `Fixture in round ${fixture.roundNumber} has an invalid scheduled date: ${fixture.scheduledAt}`,
          fixtureIds: ids,
          date: fixture.scheduledAt,
        });
      }
      if (!Number.isInteger(fixture.homeTeamId) || fixture.homeTeamId <= 0 ||
          !Number.isInteger(fixture.awayTeamId) || fixture.awayTeamId <= 0) {
        conflicts.push({
          code: "INVALID_PARTICIPANTS",
          message: `Fixture in round ${fixture.roundNumber} contains an invalid participant ID.`,
          fixtureIds: ids,
          date: fixture.scheduledAt.slice(0, 10),
        });
      } else if (fixture.homeTeamId === fixture.awayTeamId) {
        conflicts.push({
          code: "SELF_FIXTURE",
          message: `Team ${fixture.homeTeamId} cannot play against itself.`,
          fixtureIds: ids,
          teamId: fixture.homeTeamId,
          date: fixture.scheduledAt.slice(0, 10),
        });
      }
    }

    const byTeamAndDate = new Map<string, typeof allFixtures>();
    for (const fixture of allFixtures) {
      if (!validDate(fixture.scheduledAt) ||
          !Number.isInteger(fixture.homeTeamId) || fixture.homeTeamId <= 0 ||
          !Number.isInteger(fixture.awayTeamId) || fixture.awayTeamId <= 0 ||
          fixture.homeTeamId === fixture.awayTeamId) continue;

      const date = fixture.scheduledAt.slice(0, 10);
      for (const teamId of [fixture.homeTeamId, fixture.awayTeamId]) {
        const key = `${teamId}:${date}`;
        const bucket = byTeamAndDate.get(key) ?? [];
        bucket.push(fixture);
        byTeamAndDate.set(key, bucket);
      }
    }

    for (const [key, fixtures] of byTeamAndDate) {
      const uniqueFixtureKeys = new Set(fixtures.map((fixture) =>
        [fixture.scheduledAt.slice(0, 10), Math.min(fixture.homeTeamId, fixture.awayTeamId),
          Math.max(fixture.homeTeamId, fixture.awayTeamId), fixture.competitionSeasonId ?? "",
          fixture.stageId ?? "", fixture.roundNumber].join(":"),
      ));
      const teamId = Number(key.split(":")[0]);
      const date = key.slice(key.indexOf(":") + 1);
      if (fixtures.length > 1) {
        const ids = fixtures.map((fixture) => fixture.fixtureId).filter((id): id is number => id != null);
        const proposedCount = fixtures.filter((fixture) => !("existing" in fixture) || !fixture.existing).length;
        const existingCount = fixtures.length - proposedCount;

        // The same fixture appearing in both collections is not a real conflict.
        if (uniqueFixtureKeys.size === 1 && existingCount > 0 && proposedCount > 0) continue;

        conflicts.push({
          code: uniqueFixtureKeys.size < fixtures.length ? "DUPLICATE_FIXTURE" : "TEAM_DOUBLE_BOOKED",
          message: uniqueFixtureKeys.size < fixtures.length
            ? `Duplicate fixture involving team ${teamId} on ${date}.`
            : `Team ${teamId} is scheduled for multiple fixtures on ${date}.`,
          fixtureIds: ids,
          teamId,
          date,
        });
      }
    }

    return { valid: conflicts.length === 0, conflicts };
  }
}
