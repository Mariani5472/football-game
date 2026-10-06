import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { LeagueRepository, LeagueSetup, LeagueTeam } from "../domain/LeagueRepository.js";

export class SqliteLeagueRepository implements LeagueRepository {
  constructor(private readonly database: WorldDatabase) {}
  transaction<T>(work: () => T): T { return this.database.transaction(work); }

  findTeams(teamIds: number[]): LeagueTeam[] {
    if (!teamIds.length) return [];
    const marks = teamIds.map(() => "?").join(",");
    return this.database.connection.prepare(`SELECT id AS teamId, name, COALESCE(reputation,50) AS reputation FROM team WHERE id IN (${marks})`).all(...teamIds) as LeagueTeam[];
  }

  validateReferences(setup: LeagueSetup): void {
    if (setup.nationId !== undefined && !this.database.connection.prepare("SELECT 1 FROM nation WHERE id=?").get(setup.nationId)) throw new Error("Competition nation does not exist.");
    if (setup.competitionTypeId !== undefined && !this.database.connection.prepare("SELECT 1 FROM competition_type WHERE id=?").get(setup.competitionTypeId)) throw new Error("Competition type does not exist.");
  }

  createLeague(setup: LeagueSetup, rounds: Array<{ roundNumber: number; date: string; fixtures: Array<{ homeTeamId: number; awayTeamId: number; scheduledAt: string }> }>) {
    const competition = this.database.create("competition", { name: setup.name, three_letter_name: setup.shortName, nation_id: setup.nationId, type_id: setup.competitionTypeId });
    const competitionId = Number(competition.id);
    const season = this.database.create("competition_season", {
      competition_id: competitionId, year: setup.year, start_date: setup.startDate, end_date: setup.endDate, status: "SCHEDULED",
    });
    const seasonId = Number(season.id);
    const stage = this.database.create("competition_stage", { competition_season_id: seasonId, name: "League", stage_order: 1 });
    const stageId = Number(stage.id);
    for (const teamId of setup.teamIds) this.database.create("competition_team", { competition_season_id: seasonId, team_id: teamId });
    this.database.create("stage_participant_rule", { stage_id: stageId, participant_type: "TEAM", min_participants: setup.teamIds.length, max_participants: setup.teamIds.length });
    this.database.create("stage_format", { stage_id: stageId, format_type: "LEAGUE", participant_count: setup.teamIds.length, legs: 2, home_away: 1 });
    this.database.create("stage_points_rule", { stage_id: stageId, win_points: setup.winPoints, draw_points: setup.drawPoints, loss_points: setup.lossPoints });
    this.database.create("schedule_profile", { stage_id: stageId, scheduling_type: "ROUND_ROBIN", start_date: setup.startDate, end_date: setup.endDate, interval_days: setup.intervalDays, home_away_balanced: 1 });
    for (const [index, rule] of ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "WINS"].entries()) this.database.create("standing_rule", { stage_id: stageId, rule_order: index + 1, rule_type: rule });
    let fixtureCount = 0;
    for (const round of rounds) {
      const createdRound = this.database.create("competition_round", { stage_id: stageId, round_number: round.roundNumber, name: `Round ${round.roundNumber}`, start_date: round.date });
      for (const fixture of round.fixtures) {
        this.database.create("fixture", { round_id: Number(createdRound.id), home_team_id: fixture.homeTeamId, away_team_id: fixture.awayTeamId, scheduled_at: fixture.scheduledAt });
        fixtureCount++;
      }
    }
    return { competitionId, seasonId, stageId, fixtureCount };
  }
}
