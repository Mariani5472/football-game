import { afterEach, describe, expect, it } from "vitest";
import { SaveDatabase } from "../../src/database/save/SaveDatabase.js";
import { WorldDatabase } from "../../src/database/world/WorldDatabase.js";
import { CareerCalendarService } from "../../src/world/services/CareerCalendarService.js";

describe("CareerCalendarService", () => {
  let save: SaveDatabase | undefined;
  let world: WorldDatabase | undefined;

  afterEach(() => {
    if (save?.connection.open) save.close();
    if (world?.connection.open) world.close();
    save = undefined;
    world = undefined;
  });

  function setup(fixtures: Array<{ home: number; away: number; date?: string }>) {
    save = SaveDatabase.create(":memory:");
    world = WorldDatabase.create(":memory:");
    const db = save.connection;
    const saveId = Number(db.prepare(
      "INSERT INTO save (name, created_at, last_saved_at, game_date, status, version) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("Calendar test", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "2026-08-01", "ACTIVE", 1).lastInsertRowid);
    db.prepare("INSERT INTO calendar_state (save_id, game_date, season_year, day_phase) VALUES (?, ?, ?, ?)").run(saveId, "2026-08-01", 2026, "START_OF_DAY");
    for (const teamId of [1, 2, 3, 4]) {
      db.prepare("INSERT INTO team_state (save_id, team_id, reputation, morale) VALUES (?, ?, ?, ?)").run(saveId, teamId, 50, 100);
    }
    const seasonStateId = Number(db.prepare(
      "INSERT INTO season_state (save_id, competition_id, competition_season_id, year, status) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, 1, null, 2026, "SCHEDULED").lastInsertRowid);
    const stageStateId = Number(db.prepare(
      "INSERT INTO stage_state (save_id, season_state_id, world_stage_id, status, current_round_number) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, seasonStateId, null, "NOT_STARTED", 0).lastInsertRowid);
    const roundStateId = Number(db.prepare(
      "INSERT INTO round_state (save_id, stage_state_id, round_number, status, scheduled_date) VALUES (?, ?, ?, ?, ?)",
    ).run(saveId, stageStateId, 1, "SCHEDULED", "2026-08-01").lastInsertRowid);
    for (const teamId of [1, 2, 3, 4]) {
      db.prepare("INSERT INTO standing (save_id, stage_state_id, team_id) VALUES (?, ?, ?)").run(saveId, stageStateId, teamId);
    }
    for (const fixture of fixtures) {
      db.prepare(
        "INSERT INTO fixture_state (save_id, round_state_id, home_team_id, away_team_id, scheduled_at, status) VALUES (?, ?, ?, ?, ?, 'SCHEDULED')",
      ).run(saveId, roundStateId, fixture.home, fixture.away, `${fixture.date ?? "2026-08-01"}T16:00:00`);
    }
    return { saveId, stageStateId };
  }

  it("simulates all competitions for a date and persists scores and standings in the save", () => {
    const { saveId, stageStateId } = setup([{ home: 1, away: 2 }, { home: 3, away: 4 }]);
    const result = new CareerCalendarService(save!, world!).processDate(saveId, "2026-08-01");
    expect(result.fixturesPlayed).toBe(2);
    expect(save!.connection.prepare("SELECT COUNT(*) AS count FROM fixture_state WHERE save_id = ? AND status = 'PLAYED'").get(saveId)).toEqual({ count: 2 });
    expect(save!.connection.prepare("SELECT SUM(played) AS total FROM standing WHERE save_id = ? AND stage_state_id = ?").get(saveId, stageStateId)).toEqual({ total: 4 });
    expect(save!.connection.prepare("SELECT game_date AS gameDate FROM calendar_state WHERE save_id = ?").get(saveId)).toEqual({ gameDate: "2026-08-01" });
  });

  it("rejects a team double-booked on the same day without partially simulating the date", () => {
    const { saveId } = setup([{ home: 1, away: 2 }, { home: 1, away: 3 }]);
    expect(() => new CareerCalendarService(save!, world!).processDate(saveId, "2026-08-01")).toThrow(/Calendar conflicts/);
    expect(save!.connection.prepare("SELECT COUNT(*) AS count FROM fixture_state WHERE save_id = ? AND status = 'PLAYED'").get(saveId)).toEqual({ count: 0 });
    expect(save!.connection.prepare("SELECT game_date AS gameDate FROM calendar_state WHERE save_id = ?").get(saveId)).toEqual({ gameDate: "2026-08-01" });
  });

  it("does not allow moving the global clock backwards", () => {
    const { saveId } = setup([]);
    expect(() => new CareerCalendarService(save!, world!).processDate(saveId, "2026-07-31")).toThrow(/Cannot move calendar backwards/);
  });
});
