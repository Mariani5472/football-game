import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { CompetitionStageSetup, StageConfigurationRepository } from "../domain/StageConfigurationRepository.js";

export class SqliteStageConfigurationRepository implements StageConfigurationRepository {
  constructor(private readonly database: WorldDatabase) {}
  transaction<T>(work: () => T): T { return this.database.transaction(work); }
  seasonExists(seasonId: number): boolean { return Boolean(this.database.connection.prepare("SELECT 1 FROM competition_season WHERE id=?").get(seasonId)); }
  nextStageOrder(seasonId: number): number { return Number((this.database.connection.prepare("SELECT COALESCE(MAX(stage_order),0)+1 AS value FROM competition_stage WHERE competition_season_id=?").get(seasonId) as { value: number }).value); }
  stageBelongsToSeason(stageId: number, seasonId: number): boolean { return Boolean(this.database.connection.prepare("SELECT 1 FROM competition_stage WHERE id=? AND competition_season_id=?").get(stageId, seasonId)); }
  stageOrderAvailable(seasonId: number, stageOrder: number, excludingStageId: number): boolean {
    return !this.database.connection.prepare("SELECT 1 FROM competition_stage WHERE competition_season_id=? AND stage_order=? AND id<>? LIMIT 1").get(seasonId, stageOrder, excludingStageId);
  }

  createStage(setup: CompetitionStageSetup) {
    const stage = this.database.create("competition_stage", { competition_season_id: setup.seasonId, name: setup.name, stage_order: setup.stageOrder, stage_type_id: setup.stageTypeId });
    const stageId = Number(stage.id);
    this.createStageConfiguration(stageId, setup);
    return { id: stageId, seasonId: setup.seasonId, name: setup.name, stageOrder: setup.stageOrder };
  }

  updateStage(stageId: number, setup: CompetitionStageSetup) {
    this.database.update("competition_stage", stageId, { name: setup.name, stage_order: setup.stageOrder, stage_type_id: setup.stageTypeId });
    this.database.connection.prepare("DELETE FROM stage_participant_rule WHERE stage_id=?").run(stageId);
    for (const table of ["standing_rule", "stage_match_rule", "qualification_rule", "schedule_profile", "stage_points_rule", "stage_format"]) this.database.connection.prepare(`DELETE FROM "${table}" WHERE stage_id=?`).run(stageId);
    this.createStageConfiguration(stageId, setup);
    return { id: stageId, seasonId: setup.seasonId, name: setup.name, stageOrder: setup.stageOrder };
  }

  private createStageConfiguration(stageId: number, setup: CompetitionStageSetup) {
    const format = setup.format;
    if (setup.participantRule) {
      this.database.create("stage_participant_rule", {
        stage_id: stageId,
        participant_type: setup.participantRule.type,
        min_participants: setup.participantRule.minimum,
        max_participants: setup.participantRule.maximum,
      });
    }
    if (setup.participantRule && (setup.participantRule as { sourceType?: string }).sourceType) {
      const participantRule = setup.participantRule as CompetitionStageSetup["participantRule"] & { sourceType?: string; sourceCompetitionId?: number; sourceSeasonId?: number; sourceStageId?: number; positionFrom?: number; positionTo?: number };
      this.database.create("stage_participant_source", {
        stage_id: stageId,
        source_type: participantRule.sourceType,
        source_competition_id: participantRule.sourceCompetitionId,
        source_stage_id: participantRule.sourceStageId,
        position_from: participantRule.positionFrom,
        position_to: participantRule.positionTo,
      });
    }

    this.database.create("stage_format", {
      stage_id: stageId, format_type: format.type, participant_count: format.participantCount,
      group_count: format.groupCount, participants_per_group: format.participantsPerGroup,
      legs: format.legs, home_away: format.homeAway ? 1 : 0,
      aggregate_score: format.aggregateScore ? 1 : 0, extra_time: format.extraTime ? 1 : 0,
      penalties: format.penalties ? 1 : 0, away_goals_rule: format.awayGoalsRule ? 1 : 0,
    });
    if (setup.points) this.database.create("stage_points_rule", { stage_id: stageId, win_points: setup.points.win, draw_points: setup.points.draw, loss_points: setup.points.loss });
    if (setup.schedule) this.database.create("schedule_profile", {
      stage_id: stageId, scheduling_type: setup.schedule.type, start_date: setup.schedule.startDate,
      end_date: setup.schedule.endDate, interval_days: setup.schedule.intervalDays,
      home_away_balanced: setup.schedule.homeAwayBalanced === false ? 0 : 1,
    });
    for (const [index, ruleType] of (setup.standingRules ?? []).entries()) this.database.create("standing_rule", { stage_id: stageId, rule_order: index + 1, rule_type: ruleType });
    for (const rule of setup.matchRules ?? []) this.database.create("stage_match_rule", { stage_id: stageId, rule_type: rule.type, rule_value: rule.value });
    for (const rule of setup.qualificationRules ?? []) {
      const created = this.database.create("qualification_rule", {

      stage_id: stageId, position_from: rule.positionFrom, position_to: rule.positionTo,
        qualification_type: rule.type, destination_competition_id: rule.destinationCompetitionId,
      destination_stage_id: rule.destinationStageId,
    });
    return { id: stageId, seasonId: setup.seasonId, name: setup.name, stageOrder: setup.stageOrder };
  }
}
