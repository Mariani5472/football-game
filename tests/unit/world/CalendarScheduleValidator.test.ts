import { describe, expect, it } from "vitest";
import { CalendarScheduleValidator, type CalendarFixture } from "../../../src/world/services/CalendarScheduleValidator.js";

const fixture = (overrides: Partial<CalendarFixture> = {}): CalendarFixture => ({
  roundNumber: 1,
  scheduledAt: "2026-08-01",
  homeTeamId: 1,
  awayTeamId: 2,
  competitionSeasonId: 10,
  stageId: 100,
  ...overrides,
});

describe("CalendarScheduleValidator", () => {
  const validator = new CalendarScheduleValidator();

  it("accepts a valid fixture batch", () => {
    expect(validator.validate([
      fixture(),
      fixture({ roundNumber: 2, scheduledAt: "2026-08-08", homeTeamId: 2, awayTeamId: 3 }),
    ]).valid).toBe(true);
  });

  it("rejects invalid dates and self fixtures", () => {
    const result = validator.validate([
      fixture({ scheduledAt: "not-a-date" }),
      fixture({ roundNumber: 2, homeTeamId: 4, awayTeamId: 4 }),
    ]);
    expect(result.conflicts.map((conflict) => conflict.code)).toEqual(["INVALID_DATE", "SELF_FIXTURE"]);
  });

  it("rejects a team scheduled twice on the same date in one batch", () => {
    const result = validator.validate([
      fixture(),
      fixture({ roundNumber: 2, homeTeamId: 3, awayTeamId: 1 }),
    ]);
    expect(result.conflicts.some((conflict) => conflict.code === "TEAM_DOUBLE_BOOKED" && conflict.teamId === 1)).toBe(true);
  });

  it("detects conflicts with another competition already in the world", () => {
    const result = validator.validate(
      [fixture({ competitionSeasonId: 11, stageId: 110 })],
      [fixture({ fixtureId: 77, competitionSeasonId: 10, stageId: 100 })],
    );
    expect(result.valid).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.teamId === 1 && conflict.date === "2026-08-01")).toBe(true);
  });

  it("rejects participant IDs that are not positive integers", () => {
    const result = validator.validate([fixture({ awayTeamId: 0 })]);
    expect(result.conflicts.some((conflict) => conflict.code === "INVALID_PARTICIPANTS")).toBe(true);
  });
});
