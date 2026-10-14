import type { SaveDatabase } from "../../database/save/SaveDatabase.js";
import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { MatchEngine } from "../../modules/competition/engine/MatchEngine.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";
import type { CompetitionParticipant } from "../../modules/competition/domain/CompetitionParticipant.js";
import { ClubAIService } from "./ClubAIService.js";
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
  private readonly clubAI: ClubAIService;

  constructor(
    private readonly save: SaveDatabase,
    private readonly world: WorldDatabase,
  ) {
    this.clubAI = new ClubAIService(save);
  }

  processDate(saveId: number, date: string): CalendarAdvanceResult {
    this.validateDate(date);
    const startedAt = performance.now();
    const state = this.getCalendarState(saveId);
    if (date < state.gameDate) {
      throw new Error(`Cannot move calendar backwards from ${state.gameDate} to ${date}.`);
    }
    if (date === state.gameDate && state.dayPhase === "END_OF_DAY") {
      const pending = this.save.connection.prepare(
        "SELECT COUNT(*) AS count FROM fixture_state WHERE save_id = ? AND status = 'SCHEDULED'",
      ).get(saveId) as { count: number };
      return {
        saveId,
        previousDate: state.gameDate,
        currentDate: state.gameDate,
        fixturesPlayed: 0,
        fixturesPending: Number(pending.count),
        competitionsCompleted: 0,
        elapsedMs: performance.now() - startedAt,
      };
    }

    let fixturesPlayed = 0;
    let competitionsCompleted = 0;
    this.save.transaction(() => {
      this.syncTransferWindowEvents(saveId, date);
      this.syncInternationalEvents(saveId);
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
        const managedClub = this.save.connection.prepare(
          "SELECT club_id AS clubId FROM save_manager WHERE save_id = ? LIMIT 1",
        ).get(saveId) as { clubId: number | null } | undefined;
        const homePlan = this.clubAI.prepareMatch(
          saveId, fixture.homeTeamId, fixture.reputationAway,
          managedClub?.clubId === fixture.homeTeamId,
          date,
        );
        const awayPlan = this.clubAI.prepareMatch(
          saveId, fixture.awayTeamId, fixture.reputationHome,
          managedClub?.clubId === fixture.awayTeamId,
          date,
        );
        const result = this.matchEngine.simulate(
          { teamId: fixture.homeTeamId, reputation: homePlan.effectiveReputation },
          { teamId: fixture.awayTeamId, reputation: awayPlan.effectiveReputation },
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
      this.activatePendingStages(saveId, date);
      this.refreshRoundAndSeasonStatuses(saveId);
      this.createNextSeasonSnapshots(saveId, date);

      this.save.connection.prepare(
        `UPDATE calendar_state SET game_date = ?, season_year = ?, day_phase = 'END_OF_DAY' WHERE save_id = ?`,
      ).run(date, Number(date.slice(0, 4)), saveId);
      this.save.connection.prepare(
        `UPDATE save SET game_date = ?, last_saved_at = ? WHERE id = ?`,
      ).run(date, new Date().toISOString(), saveId);
      this.save.connection.prepare(
        "UPDATE calendar_event SET completed = 1 WHERE save_id = ? AND event_date <= ?",
      ).run(saveId, date);
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
    return this.processDate(
      saveId,
      state.dayPhase === "END_OF_DAY" ? addDays(state.gameDate, 1) : state.gameDate,
    );
  }

  /** Process a range in one call; useful for AI-only seasons and repeatable benchmarks. */
  simulateUntil(saveId: number, targetDate: string, maxDays = 20_000): CalendarAdvanceResult[] {
    this.validateDate(targetDate);
    const results: CalendarAdvanceResult[] = [];
    let state = this.getCalendarState(saveId);
    if (targetDate < state.gameDate) throw new Error("Target date cannot precede the current game date.");
    while ((state.gameDate < targetDate || state.dayPhase !== "END_OF_DAY") && results.length < maxDays) {
      const nextDate = state.dayPhase === "END_OF_DAY" ? addDays(state.gameDate, 1) : state.gameDate;
      results.push(this.processDate(saveId, nextDate));
      state = this.getCalendarState(saveId);
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

  /** Call-up and release boundaries participate in the same global date queue. */
  private syncInternationalEvents(saveId: number): number {
    const callups = this.save.connection.prepare(
      `SELECT player_id AS playerId, call_up_date AS callUpDate, release_date AS releaseDate
         FROM national_team_selection WHERE save_id = ? ORDER BY call_up_date, player_id`,
    ).all(saveId) as Array<{ playerId: number; callUpDate: string; releaseDate: string | null }>;
    const insert = this.save.connection.prepare(
      `INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description)
        SELECT ?, ?, ?, 85, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM calendar_event
            WHERE save_id = ? AND event_type = ? AND event_date = ? AND title = ?
         )`,
    );
    let created = 0;
    for (const callup of callups) {
      const title = `International call-up: player ${callup.playerId}`;
      created += Number(insert.run(
        saveId, "INTERNATIONAL_CALLUP", callup.callUpDate, title,
        `Player ${callup.playerId} becomes unavailable for club matches.`,
        saveId, "INTERNATIONAL_CALLUP", callup.callUpDate, title,
      ).changes);
      if (callup.releaseDate) {
        const releaseTitle = `International release: player ${callup.playerId}`;
        created += Number(insert.run(
          saveId, "INTERNATIONAL_RELEASE", callup.releaseDate, releaseTitle,
          `Player ${callup.playerId} returns from international duty.`,
          saveId, "INTERNATIONAL_RELEASE", callup.releaseDate, releaseTitle,
        ).changes);
      }
    }
    return created;
  }

  private getCalendarState(saveId: number): { gameDate: string; dayPhase: string | null } {
    const state = this.save.connection.prepare(
      "SELECT game_date AS gameDate, day_phase AS dayPhase FROM calendar_state WHERE save_id = ? LIMIT 1",
    ).get(saveId) as { gameDate: string; dayPhase: string | null } | undefined;
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
              ss.world_stage_id AS worldStageId, ss.status
         FROM stage_state ss
        WHERE ss.id = ? LIMIT 1`,
    ).get(stageStateId) as {
      stageStateId: number; seasonStateId: number; worldStageId: number | null; status: string;
    } | undefined;
    if (!row) throw new Error(`Stage state not found: ${stageStateId}.`);

    const worldStage = row.worldStageId == null ? undefined : this.world.connection.prepare(
      `SELECT COALESCE(sf.format_type, '') AS formatType,
              COALESCE(sf.legs, 1) AS legs,
              COALESCE(sp.interval_days, 7) AS intervalDays
         FROM competition_stage cs
         LEFT JOIN stage_format sf ON sf.stage_id = cs.id
         LEFT JOIN schedule_profile sp ON sp.stage_id = cs.id
        WHERE cs.id = ? LIMIT 1`,
    ).get(row.worldStageId) as { formatType: string; legs: number; intervalDays: number } | undefined;

    return {
      ...row,
      formatType: worldStage?.formatType ?? "",
      legs: worldStage?.legs ?? 1,
      intervalDays: worldStage?.intervalDays ?? 7,
    };
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
    const knockoutStages = new Set(
      (this.world.connection.prepare(
        "SELECT stage_id AS stageId FROM stage_format WHERE format_type = 'KNOCKOUT'",
      ).all() as Array<{ stageId: number }>).map((row) => row.stageId),
    );
    const stages = this.save.connection.prepare(
      "SELECT id, world_stage_id AS worldStageId FROM stage_state WHERE save_id = ? AND status <> 'COMPLETED'",
    ).all(saveId) as Array<{ id: number; worldStageId: number | null }>;
    const completeStage = this.save.connection.prepare(
      `UPDATE stage_state SET status = 'COMPLETED'
        WHERE id = ?
          AND EXISTS (SELECT 1 FROM round_state r WHERE r.stage_state_id = stage_state.id)
          AND NOT EXISTS (
            SELECT 1 FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
             WHERE r.stage_state_id = stage_state.id AND f.status = 'SCHEDULED'
          )`,
    );
    for (const stage of stages) {
      if (stage.worldStageId == null || knockoutStages.has(stage.worldStageId)) continue;
      completeStage.run(stage.id);
    }
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
      const secondLegDate = addDays(startDate, stage.intervalDays);
      const secondRoundStateId = stage.legs === 2
        ? Number(this.save.connection.prepare(
            `INSERT INTO round_state (save_id, stage_state_id, round_number, status, scheduled_date)
              VALUES (?, ?, ?, 'SCHEDULED', ?)`,
          ).run(saveId, stage.stageStateId, nextRoundNumber + 1, secondLegDate).lastInsertRowid)
        : null;
      for (let index = 0; index < ordered.length; index += 2) {
        if (ordered[index + 1] == null) continue;
        insertFixture.run(saveId, roundStateId, ordered[index], ordered[index + 1], `${startDate}T16:00:00`);
        if (secondRoundStateId != null) {
          insertFixture.run(saveId, secondRoundStateId, ordered[index + 1], ordered[index], `${secondLegDate}T16:00:00`);
        }
      }
      this.save.connection.prepare(
        "UPDATE stage_state SET current_round_number = ? WHERE id = ?",
      ).run(stage.legs === 2 ? nextRoundNumber + 1 : nextRoundNumber, stage.stageStateId);
      if (ordered.length === 2 && nextRoundNumber > 1) {
        // The final is scheduled above; stage completion waits for its result.
      }
    }
    return completed;
  }

  private activatePendingStages(saveId: number, currentDate: string): void {
    const pending = this.save.connection.prepare(
      `SELECT ss.id AS stageStateId, ss.season_state_id AS seasonStateId,
              ss.world_stage_id AS worldStageId, se.competition_season_id AS seasonTemplateId,
              se.competition_id AS competitionId
         FROM stage_state ss
         JOIN season_state se ON se.id = ss.season_state_id
        WHERE ss.save_id = ? AND ss.status = 'NOT_STARTED' AND ss.world_stage_id IS NOT NULL
        ORDER BY ss.season_state_id, ss.world_stage_id`,
    ).all(saveId) as Array<{
      stageStateId: number; seasonStateId: number; worldStageId: number;
      seasonTemplateId: number | null; competitionId: number;
    }>;
    for (const stage of pending) {
      const previous = this.world.connection.prepare(
        `SELECT id FROM competition_stage
          WHERE competition_season_id = ? AND stage_order < (
            SELECT stage_order FROM competition_stage WHERE id = ?
          )
          ORDER BY stage_order DESC LIMIT 1`,
      ).get(stage.seasonTemplateId, stage.worldStageId) as { id: number } | undefined;
      if (previous) {
        const previousState = this.save.connection.prepare(
          "SELECT status FROM stage_state WHERE save_id = ? AND season_state_id = ? AND world_stage_id = ? LIMIT 1",
        ).get(saveId, stage.seasonStateId, previous.id) as { status: string } | undefined;
        if (previousState?.status !== "COMPLETED") continue;
      }

      const teamIds = this.resolveStageParticipants(saveId, stage, previous?.id);
      const uniqueTeamIds = [...new Set(teamIds)].filter((id) => Number.isInteger(id) && id > 0);
      if (uniqueTeamIds.length < 2) {
        throw new Error(`Cannot activate stage ${stage.worldStageId}: resolved ${uniqueTeamIds.length} participant(s).`);
      }
      const participantRows = this.world.connection.prepare(
        `SELECT id AS teamId, name, COALESCE(reputation, 50) AS reputation, nation_id AS nationId
           FROM team WHERE id IN (${uniqueTeamIds.map(() => "?").join(",")}) ORDER BY id`,
      ).all(...uniqueTeamIds) as Array<{ teamId: number; name: string; reputation: number; nationId: number | null }>;
      const participants = participantRows.map((participant) => ({
        ...participant,
        nationId: participant.nationId ?? undefined,
      }));
      if (participants.length !== uniqueTeamIds.length) {
        throw new Error(`Stage ${stage.worldStageId} references a team missing from the World.`);
      }
      const seasonTemplateId = stage.seasonTemplateId ?? Number(this.world.connection.prepare(
        "SELECT competition_season_id FROM competition_stage WHERE id = ?",
      ).pluck().get(stage.worldStageId));
      this.activateStageWithParticipants(saveId, stage.stageStateId, seasonTemplateId, stage.worldStageId, participants, currentDate);
    }
  }

  private resolveStageParticipants(
    saveId: number,
    stage: { seasonStateId: number; stageStateId: number; worldStageId: number; seasonTemplateId: number | null; competitionId: number },
    previousStageId?: number,
  ): number[] {
    const sources = this.world.connection.prepare(
      `SELECT source_type AS sourceType, source_competition_id AS sourceCompetitionId,
              source_season_id AS sourceSeasonId, source_stage_id AS sourceStageId,
              position_from AS positionFrom, position_to AS positionTo
         FROM stage_participant_source WHERE stage_id = ? ORDER BY id`,
    ).all(stage.worldStageId) as Array<{
      sourceType: string; sourceCompetitionId: number | null; sourceSeasonId: number | null;
      sourceStageId: number | null; positionFrom: number | null; positionTo: number | null;
    }>;
    const resolved: number[] = [];
    for (const source of sources) {
      if (source.sourceStageId != null) {
        const sourceState = this.save.connection.prepare(
          `SELECT sourceStage.id
             FROM stage_state sourceStage
             JOIN season_state sourceSeason ON sourceSeason.id = sourceStage.season_state_id
             JOIN season_state targetSeason ON targetSeason.id = ?
            WHERE sourceStage.save_id = ? AND sourceStage.world_stage_id = ?
              AND sourceSeason.year = targetSeason.year
            ORDER BY sourceStage.id DESC LIMIT 1`,
        ).get(stage.seasonStateId, saveId, source.sourceStageId) as { id: number } | undefined;
        if (!sourceState) continue;
        const from = Math.max(1, source.positionFrom ?? 1);
        const to = Math.max(from, source.positionTo ?? from);
        const rows = this.save.connection.prepare(
          `SELECT team_id AS teamId FROM standing
            WHERE save_id = ? AND stage_state_id = ? AND position BETWEEN ? AND ?
            ORDER BY position, team_id`,
        ).all(saveId, sourceState.id, from, to) as Array<{ teamId: number }>;
        resolved.push(...rows.map((row) => row.teamId));
      } else if (source.sourceSeasonId != null) {
        const rows = this.world.connection.prepare(
          "SELECT team_id AS teamId FROM competition_team WHERE competition_season_id = ? ORDER BY team_id",
        ).all(source.sourceSeasonId) as Array<{ teamId: number }>;
        resolved.push(...rows.map((row) => row.teamId));
      }
    }
    if (resolved.length) return resolved;
    if (previousStageId != null) {
      const previousState = this.save.connection.prepare(
        "SELECT id FROM stage_state WHERE save_id = ? AND season_state_id = ? AND world_stage_id = ? LIMIT 1",
      ).get(saveId, stage.seasonStateId, previousStageId) as { id: number } | undefined;
      if (previousState) {
        const rules = this.world.connection.prepare(
          `SELECT position_from AS positionFrom, position_to AS positionTo
             FROM qualification_rule
            WHERE stage_id = ? AND (destination_stage_id = ? OR destination_competition_id = ? OR destination_stage_id IS NULL)
            ORDER BY position_from, position_to`,
        ).all(previousStageId, stage.worldStageId, stage.competitionId) as Array<{ positionFrom: number; positionTo: number }>;
        const selected = new Set<number>();
        for (const rule of rules) {
          const rows = this.save.connection.prepare(
            `SELECT team_id AS teamId FROM standing
              WHERE save_id = ? AND stage_state_id = ? AND position BETWEEN ? AND ?
              ORDER BY position, team_id`,
          ).all(saveId, previousState.id, Math.max(1, rule.positionFrom), Math.max(rule.positionFrom, rule.positionTo)) as Array<{ teamId: number }>;
          rows.forEach((row) => selected.add(row.teamId));
        }
        if (selected.size) return [...selected];
        return (this.save.connection.prepare(
          "SELECT team_id AS teamId FROM standing WHERE save_id = ? AND stage_state_id = ? ORDER BY position, team_id",
        ).all(saveId, previousState.id) as Array<{ teamId: number }>).map((row) => row.teamId);
      }
    }
    return (this.world.connection.prepare(
      "SELECT team_id AS teamId FROM competition_team WHERE competition_season_id = ? ORDER BY team_id",
    ).all(stage.seasonTemplateId) as Array<{ teamId: number }>).map((row) => row.teamId);
  }

  private activateStageWithParticipants(
    saveId: number,
    stageStateId: number,
    seasonTemplateId: number,
    worldStageId: number,
    participants: CompetitionParticipant[],
    currentDate: string,
  ): void {
    const generated = new CompetitionEngine(this.world).generateStageForParticipants(
      seasonTemplateId, worldStageId, participants,
    );
    const interval = generated.stage.schedule?.intervalDays ?? 7;
    this.persistGeneratedStage(saveId, stageStateId, generated, addDays(currentDate, interval), interval);
  }

  private createNextSeasonSnapshots(saveId: number, currentDate: string): void {
    const completed = this.save.connection.prepare(
      `SELECT se.id AS seasonStateId, se.competition_id AS competitionId,
              se.competition_season_id AS seasonTemplateId, se.year
         FROM season_state se
        WHERE se.save_id = ? AND se.status = 'COMPLETED'
          AND NOT EXISTS (
            SELECT 1 FROM season_state active
             WHERE active.save_id = se.save_id AND active.year = se.year AND active.status <> 'COMPLETED'
          )
          AND NOT EXISTS (
            SELECT 1 FROM season_state next
             WHERE next.save_id = se.save_id AND next.competition_id = se.competition_id
               AND next.year = se.year + 1
          )
        ORDER BY se.year, se.competition_id`,
    ).all(saveId) as Array<{ seasonStateId: number; competitionId: number; seasonTemplateId: number | null; year: number }>;
    for (const previous of completed) {
      if (previous.seasonTemplateId == null) continue;
      const nextYear = previous.year + 1;
      const nextTemplate = this.world.connection.prepare(
        "SELECT id, start_date AS startDate, end_date AS endDate FROM competition_season WHERE competition_id = ? AND year = ? LIMIT 1",
      ).get(previous.competitionId, nextYear) as { id: number; startDate: string | null; endDate: string | null } | undefined;
      const templateId = nextTemplate?.id ?? previous.seasonTemplateId;
      const template = this.world.connection.prepare(
        "SELECT start_date AS startDate, end_date AS endDate FROM competition_season WHERE id = ?",
      ).get(templateId) as { startDate: string | null; endDate: string | null } | undefined;
      const startDate = nextTemplate?.startDate ?? this.shiftYear(template?.startDate, nextYear);
      const endDate = nextTemplate?.endDate ?? this.shiftYear(template?.endDate, nextYear);
      const seasonStateId = Number(this.save.connection.prepare(
        `INSERT INTO season_state (save_id, competition_id, competition_season_id, year, status, start_date, end_date)
          VALUES (?, ?, ?, ?, 'SCHEDULED', ?, ?)`,
      ).run(saveId, previous.competitionId, templateId, nextYear, startDate, endDate).lastInsertRowid);
      const stages = this.world.connection.prepare(
        "SELECT id, stage_order AS stageOrder FROM competition_stage WHERE competition_season_id = ? ORDER BY stage_order",
      ).all(templateId) as Array<{ id: number; stageOrder: number }>;
      const insertStage = this.save.connection.prepare(
        "INSERT INTO stage_state (save_id, season_state_id, world_stage_id, status, current_round_number) VALUES (?, ?, ?, ?, 0)",
      );
      let firstStageStateId: number | null = null;
      for (const [index, stage] of stages.entries()) {
        const stageState = Number(insertStage.run(saveId, seasonStateId, stage.id, index === 0 ? "SCHEDULED" : "NOT_STARTED").lastInsertRowid);
        if (index === 0) firstStageStateId = stageState;
      }
      if (firstStageStateId == null || !stages.length) continue;
      let participantIds: number[];
      if (nextTemplate) {
        participantIds = (this.world.connection.prepare(
          "SELECT team_id AS teamId FROM competition_team WHERE competition_season_id = ? ORDER BY team_id",
        ).all(templateId) as Array<{ teamId: number }>).map((row) => row.teamId);
      } else {
        const priorStage = this.save.connection.prepare(
          "SELECT id FROM stage_state WHERE save_id = ? AND season_state_id = ? ORDER BY id LIMIT 1",
        ).get(saveId, previous.seasonStateId) as { id: number } | undefined;
        participantIds = priorStage ? (this.save.connection.prepare(
          "SELECT team_id AS teamId FROM standing WHERE save_id = ? AND stage_state_id = ? ORDER BY position, team_id",
        ).all(saveId, priorStage.id) as Array<{ teamId: number }>).map((row) => row.teamId) : [];
        participantIds = this.applyPromotionRelegation(saveId, previous, participantIds);
      }
      const uniqueIds = [...new Set(participantIds)].filter((id) => id > 0);
      if (uniqueIds.length < 2) {
        this.save.connection.prepare("UPDATE season_state SET status = 'BLOCKED' WHERE id = ?").run(seasonStateId);
        this.save.connection.prepare("UPDATE stage_state SET status = 'BLOCKED' WHERE id = ?").run(firstStageStateId);
        this.save.connection.prepare(
          "INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description) VALUES (?, 'SEASON_BLOCKED', ?, 90, ?, ?)",
        ).run(saveId, currentDate, `Season ${nextYear} not scheduled`, `Competition ${previous.competitionId} has fewer than two valid participants.`);
        continue;
      }
      const participantRows = this.world.connection.prepare(
        `SELECT id AS teamId, name, COALESCE(reputation, 50) AS reputation, nation_id AS nationId
           FROM team WHERE id IN (${uniqueIds.map(() => "?").join(",")}) ORDER BY id`,
      ).all(...uniqueIds) as Array<{ teamId: number; name: string; reputation: number; nationId: number | null }>;
      const participants = participantRows.map((participant) => ({
        ...participant,
        nationId: participant.nationId ?? undefined,
      }));
      if (participants.length !== uniqueIds.length) {
        this.save.connection.prepare("UPDATE season_state SET status = 'BLOCKED' WHERE id = ?").run(seasonStateId);
        this.save.connection.prepare("UPDATE stage_state SET status = 'BLOCKED' WHERE id = ?").run(firstStageStateId);
        this.save.connection.prepare(
          "INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description) VALUES (?, 'SEASON_BLOCKED', ?, 90, ?, ?)",
        ).run(saveId, currentDate, `Season ${nextYear} blocked`, "One or more participants no longer exist in the World.");
        continue;
      }
      this.insertStageSchedule(saveId, firstStageStateId, templateId, stages[0].id, participants, nextYear, currentDate);
      this.save.connection.prepare(
        "INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description) VALUES (?, 'SEASON_CREATED', ?, 60, ?, ?)",
      ).run(saveId, currentDate, `Season ${nextYear} created`, `Competition ${previous.competitionId} was rolled forward in the Save.`);
    }
  }

  private applyPromotionRelegation(
    saveId: number,
    previous: { seasonStateId: number; competitionId: number; seasonTemplateId: number | null; year: number },
    currentParticipants: number[],
  ): number[] {
    const outgoing = new Set<number>();
    const incoming = new Set<number>();
    const rules = this.world.connection.prepare(
      `SELECT q.stage_id AS stageId, q.position_from AS positionFrom,
              q.position_to AS positionTo, q.qualification_type AS type,
              COALESCE(q.destination_competition_id, destinationSeason.competition_id) AS destinationCompetitionId
         FROM qualification_rule q
         LEFT JOIN competition_stage destinationStage ON destinationStage.id = q.destination_stage_id
         LEFT JOIN competition_season destinationSeason ON destinationSeason.id = destinationStage.competition_season_id
        WHERE q.destination_competition_id IS NOT NULL OR q.destination_stage_id IS NOT NULL
        ORDER BY q.stage_id, q.position_from`,
    ).all() as Array<{
      stageId: number; positionFrom: number; positionTo: number; type: string;
      destinationCompetitionId: number | null;
    }>;
    const stageRows = this.save.connection.prepare(
      `SELECT ss.id AS stageStateId, ss.world_stage_id AS worldStageId,
              se.competition_id AS competitionId, se.year
         FROM stage_state ss JOIN season_state se ON se.id = ss.season_state_id
        WHERE ss.save_id = ? AND se.year = ? AND se.status = 'COMPLETED'`,
    ).all(saveId, previous.year) as Array<{
      stageStateId: number; worldStageId: number | null; competitionId: number; year: number;
    }>;
    for (const stage of stageRows) {
      if (stage.worldStageId == null) continue;
      for (const rule of rules.filter((item) => item.stageId === stage.worldStageId)) {
        if (rule.destinationCompetitionId == null) continue;
        const selected = this.save.connection.prepare(
          `SELECT team_id AS teamId FROM standing
            WHERE save_id = ? AND stage_state_id = ? AND position BETWEEN ? AND ?
            ORDER BY position, team_id`,
        ).all(saveId, stage.stageStateId, Math.max(1, rule.positionFrom), Math.max(rule.positionFrom, rule.positionTo)) as Array<{ teamId: number }>;
        if (stage.competitionId === previous.competitionId && rule.destinationCompetitionId !== previous.competitionId) {
          selected.forEach((row) => outgoing.add(row.teamId));
        }
        if (rule.destinationCompetitionId === previous.competitionId && stage.competitionId !== previous.competitionId) {
          selected.forEach((row) => incoming.add(row.teamId));
        }
      }
    }
    return [...new Set([
      ...currentParticipants.filter((teamId) => !outgoing.has(teamId)),
      ...incoming,
    ])];
  }

  private insertStageSchedule(
    saveId: number,
    stageStateId: number,
    seasonTemplateId: number,
    worldStageId: number,
    participants: CompetitionParticipant[],
    targetYear: number,
    currentDate: string,
  ): void {
    const generated = new CompetitionEngine(this.world).generateStageForParticipants(
      seasonTemplateId, worldStageId, participants,
    );
    const interval = generated.stage.schedule?.intervalDays ?? 7;
    const configuredStart = this.world.connection.prepare(
      "SELECT start_date AS startDate FROM schedule_profile WHERE stage_id = ?",
    ).get(worldStageId) as { startDate: string | null } | undefined;
    let baseDate = this.shiftYear(configuredStart?.startDate, targetYear) ?? addDays(currentDate, 30);
    if (baseDate <= currentDate) baseDate = addDays(currentDate, 30);
    this.persistGeneratedStage(saveId, stageStateId, generated, baseDate, interval);
  }

  private persistGeneratedStage(
    saveId: number,
    stageStateId: number,
    generated: ReturnType<CompetitionEngine["generateStageForParticipants"]>,
    baseDate: string,
    intervalDays: number,
  ): void {
    const participants = generated.participants;
    const insertStanding = this.save.connection.prepare(
      "INSERT OR IGNORE INTO standing (save_id, stage_state_id, team_id) VALUES (?, ?, ?)",
    );
    for (const participant of participants) insertStanding.run(saveId, stageStateId, participant.teamId);

    const rounds = new Map<number, typeof generated.fixtures>();
    for (const fixture of generated.fixtures) {
      const fixtures = rounds.get(fixture.roundNumber) ?? [];
      fixtures.push(fixture);
      rounds.set(fixture.roundNumber, fixtures);
    }
    const insertRound = this.save.connection.prepare(
      "INSERT INTO round_state (save_id, stage_state_id, round_number, status, scheduled_date) VALUES (?, ?, ?, 'SCHEDULED', ?)",
    );
    const insertFixture = this.save.connection.prepare(
      "INSERT INTO fixture_state (save_id, round_state_id, home_team_id, away_team_id, scheduled_at, status) VALUES (?, ?, ?, ?, ?, 'SCHEDULED')",
    );
    const insertCalendarEvent = this.save.connection.prepare(
      "INSERT INTO calendar_event (save_id, event_type, event_date, priority, title, description) VALUES (?, 'FIXTURE', ?, 50, ?, ?)",
    );
    const occupied = this.save.connection.prepare(
      `SELECT f.id AS fixtureId, r.stage_state_id AS stageId, r.round_number AS roundNumber,
              f.scheduled_at AS scheduledAt, f.home_team_id AS homeTeamId, f.away_team_id AS awayTeamId
         FROM fixture_state f JOIN round_state r ON r.id = f.round_state_id
        WHERE f.save_id = ? AND f.scheduled_at IS NOT NULL`,
    ).all(saveId) as CalendarFixture[];
    let previousDate: string | null = null;
    for (const [roundNumber, fixtures] of [...rounds.entries()].sort(([a], [b]) => a - b)) {
      let scheduledDate = addDays(baseDate, Math.max(0, roundNumber - 1) * intervalDays);
      if (previousDate && scheduledDate < addDays(previousDate, intervalDays)) {
        scheduledDate = addDays(previousDate, intervalDays);
      }
      let scheduledFixtures: typeof fixtures | null = null;
      for (let offset = 0; offset <= 365; offset++) {
        const candidate = fixtures.map((fixture) => ({
          ...fixture,
          scheduledAt: `${scheduledDate}T16:00:00`,
        }));
        const validation = this.scheduleValidator.validate(candidate.map((fixture) => ({
          roundNumber: fixture.roundNumber,
          scheduledAt: fixture.scheduledAt,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
        })), occupied);
        if (validation.valid) {
          scheduledFixtures = candidate;
          break;
        }
        scheduledDate = addDays(scheduledDate, 1);
      }
      if (!scheduledFixtures) {
        throw new Error(`Could not schedule stage ${generated.stage.id} round ${roundNumber} without a club conflict.`);
      }
      const roundStateId = Number(insertRound.run(saveId, stageStateId, roundNumber, scheduledDate).lastInsertRowid);
      for (const fixture of scheduledFixtures) {
        if (fixture.homeTeamId <= 0 || fixture.awayTeamId <= 0 || fixture.homeTeamId === fixture.awayTeamId) {
          throw new Error(`Invalid generated fixture for stage ${generated.stage.id}.`);
        }
        insertFixture.run(saveId, roundStateId, fixture.homeTeamId, fixture.awayTeamId, fixture.scheduledAt);
        insertCalendarEvent.run(
          saveId,
          scheduledDate,
          `${generated.competition.name} · Matchday`,
          `${fixture.homeTeamId} vs ${fixture.awayTeamId}`,
        );
        occupied.push({
          stageId: stageStateId,
          roundNumber,
          scheduledAt: fixture.scheduledAt,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
        });
      }
      previousDate = scheduledDate;
    }
    this.save.connection.prepare(
      "UPDATE stage_state SET status = 'SCHEDULED', current_round_number = 0 WHERE id = ?",
    ).run(stageStateId);
  }

  private shiftYear(date: string | null | undefined, targetYear: number): string | null {
    if (!date) return null;
    const value = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
    value.setUTCFullYear(targetYear);
    return value.toISOString().slice(0, 10);
  }

  private validateDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new Error(`Invalid calendar date: ${date}`);
    }
  }
}
