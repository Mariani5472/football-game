import type { SaveDatabase } from "../../database/save/SaveDatabase.js";
import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { MatchEngine } from "../../modules/competition/engine/MatchEngine.js";
import { StandingEngine } from "../../modules/competition/engine/StandingEngine.js";
import { CalendarScheduleValidator, type CalendarFixture } from "./CalendarScheduleValidator.js";

export interface CalendarAdvanceResult {
  saveId: number;
  previousDate: string;
  currentDate: string;
  fixturesPlayed: number;
  fixturesPending: number;
  competitionsCompleted: number;
  elapsedMs: number;
}

interface StoredFixture extends CalendarFixture {
  fixtureStateId: number;
  saveId: number;
  roundStateId: number;
  stageStateId: number;
  reputationHome: number;
  reputationAway: number;
}

interface StageRuntime {
  stageStateId: number;
  seasonStateId: number;
  worldStageId: number | null;
  status: string;
  formatType: string | null;
  legs: number;
  intervalDays: number;
}

const DAY_MS = 86_400_000;

function addDays(date: string, days: number): string {
  const value = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function deterministicSeed(date: string, fixtureId: number): number {
  let seed = fixtureId * 7919;
  for (const char of date) seed = Math.imul(seed ^ char.charCodeAt(0), 31);
  return Math.abs(seed) || 1;
}

/**
 * Save-owned calendar runtime. World data is read-only input; every result,
 * standings update, event and clock transition is persisted to the Save.
 */
export class CareerCalendarService {
  private readonly matchEngine = new MatchEngine();
  private readonly standingEngine = new StandingEngine();
  private readonly scheduleValidator = new CalendarScheduleValidator();

  constructor(
    private readonly save: SaveDatabase,
    private readonly world: WorldDatabase,
  ) {}

  processDate(saveId: number, date: string): CalendarAdvanceResult {
    this.validateDate(date);
    const startedAt = performance.now();
    const state = this.getCalendarState(saveId);
    if (date < state.gameDate) {
      throw new Error(`Cannot move calendar backwards from ${state.gameDate} to ${date}.`);
    }

    let fixturesPlayed = 0;
    let competitionsCompleted = 0;
    this.save.transaction(() => {
      this.syncTransferWindowEvents(saveId, date);
      const due = this.findFixtures(saveId, date);
      const validation = this.scheduleValidator.validate(due.map((fixture) => ({
        fixtureId: fixture.fixtureStateId,
        stageId: fixture.stageStateId,
        roundNumber: fixture.roundNumber,
        scheduledAt: fixture.scheduledAt,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
      })));
      if (!validation.valid) {
        throw new Error(`Calendar conflicts on ${date}: ${validation.conflicts.map((item) => item.message).join("; ")}`);
      }

      for (const fixture of due) {
        const seed = deterministicSeed(date, fixture.fixtureStateId);
        const result = this.matchEngine.simulate(
          { teamId: fixture.homeTeamId, reputation: fixture.reputationHome },
          { teamId: fixture.awayTeamId, reputation: fixture.reputationAway },
          seed,
        );
        const stage = this.getStageRuntime(fixture.stageStateId);
        let winnerTeamId: number | null = null;
        if (stage.formatType === "KNOCKOUT") {
          if (result.homeGoals > result.awayGoals) winnerTeamId = result.homeTeamId;
          else if (result.awayGoals > result.homeGoals) winnerTeamId = result.awayTeamId;
          else winnerTeamId = seed % 2 === 0 ? result.homeTeamId : result.awayTeamId;
        }

        this.save.connection.prepare(
          `UPDATE fixture_state
              SET status = 'PLAYED', home_score = ?, away_score = ?,
                  winner_team_id = ?, played_at = ?
            WHERE id = ? AND save_id = ? AND status = 'SCHEDULED'`,
        ).run(result.homeGoals, result.awayGoals, winnerTeamId, date, fixture.fixtureStateId, saveId);
        fixturesPlayed++;
      }

      this.refreshStandings(saveId);
      this.refreshRoundAndSeasonStatuses(saveId);
      competitionsCompleted = this.progressKnockoutStages(saveId, date);
      this.refreshRoundAndSeasonStatuses(saveId);

      this.save.connection.prepare(
        `UPDATE calendar_state SET game_date = ?, season_year = ?, day_phase = 'END_OF_DAY' WHERE save_id = ?`,
      ).run(date, Number(date.slice(0, 4)), saveId);
      this.save.connection.prepare(
        `UPDATE save SET game_date = ?, last_saved_at = ? WHERE id = ?`,
      ).run(date, new Date().toISOString(), saveId);
      this.save.connection.prepare(
        `INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description, completed)
          VALUES (?, 'DAY_PROCESSED', ?, 10, 'Calendar day processed', ?, 1)`,
      ).run(saveId, date, `${fixturesPlayed} fixture(s) processed.`);
    });

    const counts = this.save.connection.prepare(
      `SELECT COUNT(*) AS count FROM fixture_state WHERE save_id = ? AND status = 'SCHEDULED'`,
    ).get(saveId) as { count: number };
    return {
      saveId,
      previousDate: state.gameDate,
      currentDate: date,
      fixturesPlayed,
      fixturesPending: Number(counts.count),
      competitionsCompleted,
      elapsedMs: performance.now() - startedAt,
    };
  }

  /** Advance to the next meaningful calendar date, processing all competitions together. */
  advanceToNextDate(saveId: number): CalendarAdvanceResult {
    const state = this.getCalendarState(saveId);
    const nextFixture = this.save.connection.prepare(
      `SELECT MIN(substr(scheduled_at, 1, 10)) AS date
         FROM fixture_state
        WHERE save_id = ? AND status = 'SCHEDULED' AND substr(scheduled_at, 1, 10) > ?`,
    ).get(saveId, state.gameDate) as { date: string | null };
    const nextEvent = this.save.connection.prepare(
      `SELECT MIN(event_date) AS date FROM calendar_event
        WHERE save_id = ? AND completed = 0 AND event_date > ?`,
    ).get(saveId, state.gameDate) as { date: string | null };
    const candidates = [nextFixture.date, nextEvent.date].filter((value): value is string => Boolean(value)).sort();
    const nextDate = candidates[0] ?? addDays(state.gameDate, 1);
    return this.processDate(saveId, nextDate);
  }

  /** Process a range in one call; useful for AI-only seasons and repeatable benchmarks. */
  simulateUntil(saveId: number, targetDate: string, maxDays = 20_000): CalendarAdvanceResult[] {
    this.validateDate(targetDate);
    const results: CalendarAdvanceResult[] = [];
    let state = this.getCalendarState(saveId);
    if (targetDate < state.gameDate) throw new Error("Target date cannot precede the current game date.");
    while (state.gameDate < targetDate && results.length < maxDays) {
      const next = this.advanceToNextDate(saveId);
      results.push(next);
      state = this.getCalendarState(saveId);
      if (next.currentDate === targetDate) break;
      if (next.currentDate > targetDate) {
        // The next fixture/event is beyond the target; advance only to the requested date.
        results.push(this.processDate(saveId, targetDate));
        break;
      }
    }
    if (results.length >= maxDays && this.getCalendarState(saveId).gameDate < targetDate) {
      throw new Error(`Simulation exceeded maxDays=${maxDays}.`);
    }
    return results;
  }

  /** Idempotently creates calendar entries for transfer-window boundaries. */
  syncTransferWindowEvents(saveId: number, throughDate: string): number {
    const windows = this.world.connection.prepare(
      `SELECT id, name, start_date AS startDate, end_date AS endDate
         FROM transfer_window
        WHERE start_date <= ? AND end_date >= ?
        ORDER BY start_date, id`,
    ).all(throughDate, this.getCalendarState(saveId).gameDate) as Array<{
      id: number; name: string; startDate: string; endDate: string;
    }>;
    const insert = this.save.connection.prepare(
      `INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description)
        SELECT ?, ?, ?, 80, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM calendar_event
            WHERE save_id = ? AND event_type = ? AND event_date = ? AND title = ?
         )`,
    );
    let created = 0;
    for (const window of windows) {
      created += Number(insert.run(
        saveId, "TRANSFER_WINDOW_OPEN", window.startDate, window.name,
        `Transfer window #${window.id} opens.`, saveId, "TRANSFER_WINDOW_OPEN", window.startDate, window.name,
      ).changes);
      created += Number(insert.run(
        saveId, "TRANSFER_WINDOW_CLOSE", window.endDate, window.name,
        `Transfer window #${window.id} closes.`, saveId, "TRANSFER_WINDOW_CLOSE", window.endDate, window.name,
      ).changes);
    }
    return created;
  }

  private getCalendarState(saveId: number): { gameDate: string } {
    const state = this.save.connection.prepare(
      "SELECT game_date AS gameDate FROM calendar_state WHERE save_id = ? LIMIT 1",
    ).get(saveId) as { gameDate: string } | undefined;
    if (!state) throw new Error(`Calendar state not found for save ${saveId}.`);
    return state;
  }

  private findFixtures(saveId: number, date: string): StoredFixture[] {
    return this.save.connection.prepare(
      `SELECT f.id AS fixtureStateId, f.save_id AS saveId, f.round_state_id AS roundStateId,
              rs.stage_state_id AS stageStateId, rs.round_number AS roundNumber,
              f.scheduled_at AS scheduledAt, f.home_team_id AS homeTeamId, f.away_team_id AS awayTeamId,
              COALESCE(home.reputation, 50) AS reputationHome,
              COALESCE(away.reputation, 50) AS reputationAway
         FROM fixture_state f
         JOIN round_state rs ON rs.id = f.round_state_id
         LEFT JOIN team_state home ON home.save_id = f.save_id AND home.team_id = f.home_team_id
         LEFT JOIN team_state away ON away.save_id = f.save_id AND away.team_id = f.away_team_id
        WHERE f.save_id = ? AND f.status = 'SCHEDULED'
          AND substr(f.scheduled_at, 1, 10) = ?
        ORDER BY rs.stage_state_id, rs.round_number, f.id`,
    ).all(saveId, date) as StoredFixture[];
  }

  private getStageRuntime(stageStateId: number): StageRuntime {
    const row = this.save.connection.prepare(
      `SELECT ss.id AS stageStateId, ss.season_state_id AS seasonStateId,
              ss.world_stage_id AS worldStageId, ss.status,
              COALESCE(sf.format_type, '') AS formatType, COALESCE(sf.legs, 1) AS legs,
              COALESCE(sp.interval_days, 7) AS intervalDays
         FROM stage_state ss
         LEFT JOIN stage_format sf ON sf.stage_id = ss.world_stage_id
         LEFT JOIN schedule_profile sp ON sp.stage_id = ss.world_stage_id
        WHERE ss.id = ? LIMIT 1`,
    ).get(stageStateId) as StageRuntime | undefined;
    if (!row) throw new Error(`Stage state not found: ${stageStateId}.`);
    return row;
  }

  private refreshStandings(saveId: number): void {
    const stages = this.save.connection.prepare(
      "SELECT id, world_stage_id AS worldStageId FROM stage_state WHERE save_id = ?",
    ).all(saveId) as Array<{ id: number; worldStageId: number | null }>;
    for (const stage of stages) {
      const teams = this.save.connection.prepare(
        "SELECT team_id AS teamId FROM standing WHERE save_id = ? AND stage_state_id = ? ORDER BY team_id",
      ).all(saveId, stage.id) as Array<{ teamId: number }>;
      if (!teams.length) continue;
      const points = stage.worldStageId == null ? null : this.world.connection.prepare(
        "SELECT win_points AS winPoints, draw_points AS drawPoints, loss_points AS lossPoints FROM stage_points_rule WHERE stage_id = ?",
      ).get(stage.worldStageId) as { winPoints: number; drawPoints: number; lossPoints: number } | undefined;
      const rules = stage.worldStageId == null ? [] : (this.world.connection.prepare(
        "SELECT rule_type AS ruleType FROM standing_rule WHERE stage_id = ? ORDER BY rule_order",
      ).all(stage.worldStageId) as Array<{ ruleType: string }>).map((row) => row.ruleType);
      const table = this.standingEngine.initialize(teams.map((team) => ({
        teamId: team.teamId, name: String(team.teamId), reputation: 50,
      })));
      const fixtures = this.save.connection.prepare(
        `SELECT f.home_team_id AS homeTeamId, f.away_team_id AS awayTeamId,
                f.home_score AS homeGoals, f.away_score AS awayGoals
           FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
          WHERE f.save_id = ? AND r.stage_state_id = ? AND f.status = 'PLAYED'
            AND f.home_score IS NOT NULL AND f.away_score IS NOT NULL
          ORDER BY r.round_number, f.id`,
      ).all(saveId, stage.id) as Array<{ homeTeamId: number; awayTeamId: number; homeGoals: number; awayGoals: number }>;
      const pointsRule = points ?? { winPoints: 3, drawPoints: 1, lossPoints: 0 };
      for (const fixture of fixtures) {
        this.standingEngine.applyResult(table, {
          homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId,
          homeGoals: fixture.homeGoals, awayGoals: fixture.awayGoals,
        }, pointsRule);
      }
      const ordered = this.standingEngine.sort(table, rules.length ? rules : undefined);
      const update = this.save.connection.prepare(
        `UPDATE standing SET position = ?, played = ?, wins = ?, draws = ?, losses = ?,
           goals_for = ?, goals_against = ?, points = ?
          WHERE save_id = ? AND stage_state_id = ? AND team_id = ?`,
      );
      ordered.forEach((row, index) => update.run(
        index + 1, row.played, row.wins, row.draws, row.losses,
        row.goalsFor, row.goalsAgainst, row.points, saveId, stage.id, row.teamId,
      ));
    }
  }

  private refreshRoundAndSeasonStatuses(saveId: number): void {
    this.save.connection.prepare(
      `UPDATE round_state SET status = CASE
          WHEN NOT EXISTS (SELECT 1 FROM fixture_state f WHERE f.round_state_id = round_state.id AND f.status = 'SCHEDULED')
           AND EXISTS (SELECT 1 FROM fixture_state f WHERE f.round_state_id = round_state.id)
          THEN 'COMPLETED' ELSE 'SCHEDULED' END
        WHERE save_id = ?`,
    ).run(saveId);
    this.save.connection.prepare(
      `UPDATE season_state SET status = CASE
          WHEN EXISTS (SELECT 1 FROM stage_state st WHERE st.season_state_id = season_state.id AND st.status <> 'COMPLETED')
          THEN 'IN_PROGRESS' ELSE 'COMPLETED' END
        WHERE save_id = ?`,
    ).run(saveId);
  }

  private progressKnockoutStages(saveId: number, currentDate: string): number {
    const stages = this.save.connection.prepare(
      `SELECT id FROM stage_state WHERE save_id = ? AND status <> 'COMPLETED'`,
    ).all(saveId) as Array<{ id: number }>;
    let completed = 0;
    for (const item of stages) {
      const stage = this.getStageRuntime(item.id);
      if (stage.formatType !== "KNOCKOUT" || stage.worldStageId == null) continue;
      const latest = this.save.connection.prepare(
        "SELECT MAX(round_number) AS roundNumber FROM round_state WHERE save_id = ? AND stage_state_id = ?",
      ).get(saveId, stage.stageStateId) as { roundNumber: number | null };
      if (latest.roundNumber == null) continue;
      const roundNumber = Number(latest.roundNumber);
      if (stage.legs === 2 && roundNumber % 2 !== 0) continue;
      const pending = this.save.connection.prepare(
        `SELECT COUNT(*) AS count FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
          WHERE f.save_id = ? AND r.stage_state_id = ? AND r.round_number <= ? AND f.status = 'SCHEDULED'`,
      ).get(saveId, stage.stageStateId, roundNumber) as { count: number };
      if (Number(pending.count) > 0) continue;

      const allTeams = this.save.connection.prepare(
        "SELECT team_id AS teamId FROM standing WHERE save_id = ? AND stage_state_id = ? ORDER BY team_id",
      ).all(saveId, stage.stageStateId) as Array<{ teamId: number }>;
      const earlierFixtures = this.save.connection.prepare(
        `SELECT r.round_number AS roundNumber, f.home_team_id AS homeTeamId, f.away_team_id AS awayTeamId,
                f.home_score AS homeGoals, f.away_score AS awayGoals, f.winner_team_id AS winnerTeamId
           FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
          WHERE f.save_id = ? AND r.stage_state_id = ? AND r.round_number <= ? AND f.status = 'PLAYED'
          ORDER BY r.round_number, f.id`,
      ).all(saveId, stage.stageStateId, roundNumber) as Array<{
        roundNumber: number; homeTeamId: number; awayTeamId: number; homeGoals: number;
        awayGoals: number; winnerTeamId: number | null;
      }>;

      const eliminated = new Set<number>();
      if (stage.legs === 1) {
        for (const fixture of earlierFixtures) {
          if (fixture.winnerTeamId == null) continue;
          eliminated.add(fixture.winnerTeamId === fixture.homeTeamId ? fixture.awayTeamId : fixture.homeTeamId);
        }
      } else {
        const pairs = new Map<string, typeof earlierFixtures>();
        for (const fixture of earlierFixtures) {
          const key = [Math.min(fixture.homeTeamId, fixture.awayTeamId), Math.max(fixture.homeTeamId, fixture.awayTeamId)].join(":");
          const pair = pairs.get(key) ?? [];
          pair.push(fixture);
          pairs.set(key, pair);
        }
        for (const pair of pairs.values()) {
          if (pair.length < 2) continue;
          const homeId = pair[0].homeTeamId;
          const awayId = pair[0].awayTeamId;
          const homeTotal = pair.reduce((sum, fixture) => sum + (fixture.homeTeamId === homeId ? fixture.homeGoals : fixture.awayGoals), 0);
          const awayTotal = pair.reduce((sum, fixture) => sum + (fixture.awayTeamId === awayId ? fixture.awayGoals : fixture.homeGoals), 0);
          const winner = homeTotal === awayTotal
            ? (deterministicSeed(currentDate, pair[0].homeTeamId + pair[0].awayTeamId) % 2 === 0 ? homeId : awayId)
            : (homeTotal > awayTotal ? homeId : awayId);
          eliminated.add(winner === homeId ? awayId : homeId);
        }
      }

      const entrants = allTeams.map((team) => team.teamId).filter((teamId) => !eliminated.has(teamId));
      if (entrants.length <= 1) {
        this.save.connection.prepare("UPDATE stage_state SET status = 'COMPLETED' WHERE id = ?").run(stage.stageStateId);
        completed++;
        continue;
      }

      const latestRoundTeams = new Set<number>();
      for (const fixture of earlierFixtures.filter((row) => row.roundNumber >= (stage.legs === 2 ? roundNumber - 1 : roundNumber))) {
        latestRoundTeams.add(fixture.homeTeamId);
        latestRoundTeams.add(fixture.awayTeamId);
      }
      // Preserve first-round byes (teams not yet scheduled) and pair the remaining survivors.
      const scheduledBefore = new Set<number>();
      for (const fixture of earlierFixtures) {
        scheduledBefore.add(fixture.homeTeamId);
        scheduledBefore.add(fixture.awayTeamId);
      }
      const survivors = entrants.filter((teamId) => !scheduledBefore.has(teamId) || latestRoundTeams.has(teamId));
      const ordered = survivors.sort((a, b) => a - b);
      if (ordered.length < 2) {
        this.save.connection.prepare("UPDATE stage_state SET status = 'COMPLETED' WHERE id = ?").run(stage.stageStateId);
        completed++;
        continue;
      }

      const nextRoundNumber = roundNumber + 1;
      const lastDate = this.save.connection.prepare(
        `SELECT MAX(substr(f.scheduled_at, 1, 10)) AS date
           FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
          WHERE f.save_id = ? AND r.stage_state_id = ?`,
      ).get(saveId, stage.stageStateId) as { date: string | null };
      const startDate = addDays(lastDate.date ?? currentDate, stage.intervalDays);
      const roundResult = this.save.connection.prepare(
        `INSERT INTO round_state (save_id, stage_state_id, round_number, status, scheduled_date)
          VALUES (?, ?, ?, 'SCHEDULED', ?)`,
      ).run(saveId, stage.stageStateId, nextRoundNumber, startDate);
      const roundStateId = Number(roundResult.lastInsertRowid);
      const insertFixture = this.save.connection.prepare(
        `INSERT INTO fixture_state (save_id, round_state_id, home_team_id, away_team_id, scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, 'SCHEDULED')`,
      );
      for (let index = 0; index < ordered.length; index += 2) {
        if (ordered[index + 1] == null) continue;
        insertFixture.run(saveId, roundStateId, ordered[index], ordered[index + 1], `${startDate}T16:00:00`);
      }
      this.save.connection.prepare(
        "UPDATE stage_state SET current_round_number = ? WHERE id = ?",
      ).run(nextRoundNumber, stage.stageStateId);
      if (ordered.length === 2 && nextRoundNumber > 1) {
        // The final is scheduled above; stage completion waits for its result.
      }
    }
    return completed;
  }

  private validateDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new Error(`Invalid calendar date: ${date}`);
    }
  }
}
