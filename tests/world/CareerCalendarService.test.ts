import { afterEach, describe, expect, it } from "vitest";
import DatabaseConnection from "better-sqlite3";
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
    const worldConnection = new DatabaseConnection(":memory:");
    worldConnection.exec(`
      CREATE TABLE competition (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
      CREATE TABLE transfer_window (
        id INTEGER PRIMARY KEY AUTOINCREMENT, competition_id INTEGER, nation_id INTEGER,
        name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL
      );
      CREATE TABLE stage_format (stage_id INTEGER PRIMARY KEY, format_type TEXT NOT NULL, legs INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE stage_points_rule (stage_id INTEGER PRIMARY KEY, win_points INTEGER NOT NULL DEFAULT 3, draw_points INTEGER NOT NULL DEFAULT 1, loss_points INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE standing_rule (id INTEGER PRIMARY KEY AUTOINCREMENT, stage_id INTEGER NOT NULL, rule_type TEXT NOT NULL, rule_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE schedule_profile (stage_id INTEGER PRIMARY KEY, interval_days INTEGER);
      CREATE TABLE competition_season (id INTEGER PRIMARY KEY, competition_id INTEGER, year INTEGER, start_date TEXT, end_date TEXT);
      CREATE TABLE competition_stage (id INTEGER PRIMARY KEY, competition_season_id INTEGER, stage_order INTEGER);
      CREATE TABLE qualification_rule (id INTEGER PRIMARY KEY, stage_id INTEGER, position_from INTEGER, position_to INTEGER, qualification_type TEXT, destination_competition_id INTEGER, destination_stage_id INTEGER);
      CREATE TABLE stage_participant_source (id INTEGER PRIMARY KEY, stage_id INTEGER, source_type TEXT, source_competition_id INTEGER, source_season_id INTEGER, source_stage_id INTEGER, position_from INTEGER, position_to INTEGER);
      CREATE TABLE competition_team (competition_season_id INTEGER, team_id INTEGER);
      CREATE TABLE team (id INTEGER PRIMARY KEY, name TEXT, reputation INTEGER, nation_id INTEGER);
    `);
    world = {
      connection: worldConnection,
      close: () => worldConnection.close(),
    } as unknown as WorldDatabase;
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

  it("advances the global clock one day at a time", () => {
    const { saveId } = setup([]);
    const calendar = new CareerCalendarService(save!, world!);
    const firstDay = calendar.advanceToNextDate(saveId);
    const secondDay = calendar.advanceToNextDate(saveId);
    expect(firstDay.currentDate).toBe("2026-08-01");
    expect(secondDay.currentDate).toBe("2026-08-02");
  });

  it("puts transfer windows and international call-ups on the shared calendar", () => {
    const { saveId } = setup([]);
    const competitionId = Number(world!.connection.prepare(
      "INSERT INTO competition (name) VALUES (?)",
    ).run("Calendar test competition").lastInsertRowid);
    world!.connection.prepare(
      "INSERT INTO transfer_window (competition_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
    ).run(competitionId, "Summer window", "2026-08-02", "2026-08-05");
    save!.connection.prepare(
      "INSERT INTO team_squad_state (save_id, team_id, player_id, squad_status) VALUES (?, ?, ?, ?)",
    ).run(saveId, 1, 99, "FIRST_TEAM");
    save!.connection.prepare(
      "INSERT INTO national_team_selection (save_id, national_team_id, player_id, call_up_date, release_date, status) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(saveId, 100, 99, "2026-08-02", "2026-08-03", "CALLED");

    new CareerCalendarService(save!, world!).processDate(saveId, "2026-08-02");
    const events = save!.connection.prepare(
      "SELECT event_type AS eventType, event_date AS eventDate, completed FROM calendar_event WHERE save_id = ? AND event_type IN ('TRANSFER_WINDOW_OPEN', 'TRANSFER_WINDOW_CLOSE', 'INTERNATIONAL_CALLUP', 'INTERNATIONAL_RELEASE') ORDER BY event_date, event_type",
    ).all(saveId) as Array<{ eventType: string; eventDate: string; completed: number }>;
    expect(events).toEqual([
      { eventType: "INTERNATIONAL_CALLUP", eventDate: "2026-08-02", completed: 1 },
      { eventType: "TRANSFER_WINDOW_OPEN", eventDate: "2026-08-02", completed: 1 },
      { eventType: "INTERNATIONAL_RELEASE", eventDate: "2026-08-03", completed: 0 },
      { eventType: "TRANSFER_WINDOW_CLOSE", eventDate: "2026-08-05", completed: 0 },
    ]);
  });

  it("generates the next knockout round only after every tie in the current round is played", () => {
    const { saveId, stageStateId } = setup([{ home: 1, away: 2 }, { home: 3, away: 4 }]);
    world!.connection.exec(`
      INSERT INTO competition_season (id, competition_id, year) VALUES (10, 1, 2026);
      INSERT INTO competition_stage (id, competition_season_id, stage_order) VALUES (99, 10, 1);
      INSERT INTO stage_format (stage_id, format_type, legs) VALUES (99, 'KNOCKOUT', 1);
      INSERT INTO schedule_profile (stage_id, interval_days) VALUES (99, 7);
      INSERT INTO stage_points_rule (stage_id, win_points, draw_points, loss_points) VALUES (99, 3, 1, 0);
    `);
    save!.connection.prepare(
      "UPDATE stage_state SET world_stage_id = 99, status = 'SCHEDULED' WHERE id = ?",
    ).run(stageStateId);
    const calendar = new CareerCalendarService(save!, world!);
    calendar.processDate(saveId, "2026-08-01");
    expect(save!.connection.prepare(
      "SELECT MAX(round_number) AS roundNumber FROM round_state WHERE save_id = ? AND stage_state_id = ?",
    ).get(saveId, stageStateId)).toEqual({ roundNumber: 2 });
    expect(save!.connection.prepare(
      "SELECT COUNT(*) AS count FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id WHERE f.save_id = ? AND r.stage_state_id = ? AND r.round_number = 2 AND f.status = 'SCHEDULED'",
    ).get(saveId, stageStateId)).toEqual({ count: 1 });

    calendar.processDate(saveId, "2026-08-08");
    expect(save!.connection.prepare(
      "SELECT status FROM stage_state WHERE id = ?",
    ).get(stageStateId)).toEqual({ status: "COMPLETED" });
    expect(save!.connection.prepare(
      "SELECT COUNT(*) AS count FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id WHERE f.save_id = ? AND r.stage_state_id = ? AND f.status = 'SCHEDULED'",
    ).get(saveId, stageStateId)).toEqual({ count: 0 });
  });

  it("does not allow moving the global clock backwards", () => {
    const { saveId } = setup([]);
    expect(() => new CareerCalendarService(save!, world!).processDate(saveId, "2026-07-31")).toThrow(/Cannot move calendar backwards/);
  });
});
