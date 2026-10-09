import type { SqlValue } from "../database/Database.js";
import { EditorApplication } from "./application/EditorApplication.js";
import type { ContractInput } from "../modules/career/domain/ContractRepository.js";
import type { FinanceInput } from "../modules/finance/domain/FinanceRepository.js";
import type { TransferInput } from "../modules/transfer/domain/TransferRepository.js";
import type { ClubCreationData } from "../modules/club/domain/ClubRepository.js";
import type { PlayerCreationData } from "../modules/player/domain/PlayerRepository.js";
import type { CompetitionStageSetup } from "../modules/competition/domain/StageConfigurationRepository.js";
import type { LeagueSetup } from "../modules/competition/domain/LeagueRepository.js";
import type { CompetitionHistoryInput } from "../modules/competition/domain/CompetitionHistoryRepository.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";

export type { ContractInput };
export type { FinanceInput };
export type { TransferInput };
export type { CompetitionHistoryInput };

export class WorldDomainService {
  private readonly application: EditorApplication;

  constructor(private readonly database: WorldDatabase) {
    this.application = new EditorApplication(database);
  }

  duplicateStadium(stadiumId: number) {
    return this.application.duplicateStadium(stadiumId);
  }

  duplicateCompetition(competitionId: number) {
    return this.application.duplicateCompetition(competitionId);
  }

  createClub(input: ClubCreationData) {
    return this.application.createClub(input);
  }

  createPlayer(input: PlayerCreationData) {
    return this.application.createPlayer(input);
  }

  createLeague(input: LeagueSetup) {
    return this.application.createLeague(input);
  }

  createCompetitionStage(input: CompetitionStageSetup) {
    return this.application.createCompetitionStage(input);
  }

  updateCompetitionStage(stageId: number, input: CompetitionStageSetup) {
    return this.application.updateCompetitionStage(stageId, input);
  }

  createTransfer(input: TransferInput) {
    return this.application.createTransfer(input);
  }

  createContract(input: ContractInput) {
    return this.application.createContract(input);
  }

  saveClubFinance(input: FinanceInput) {
    return this.application.saveClubFinance(input);
  }

  createCompetitionHistory(input: CompetitionHistoryInput) {
    return this.application.createCompetitionHistory(input);
  }

  createAwardHistory(input: {
    awardId: number;
    year: number;
    ranking: number;
    recipient: { personId?: number; clubId?: number; nationId?: number };
  }) {
    const count = [input.recipient.personId, input.recipient.clubId, input.recipient.nationId]
      .filter(value => value !== undefined).length;
    if (count !== 1) throw new Error("Um prêmio deve ter exatamente um tipo de vencedor.");
    return this.database.create("award_history", {
      award_id: input.awardId,
      year: input.year,
      ranking: input.ranking,
      person_id: input.recipient.personId,
      club_id: input.recipient.clubId,
      nation_id: input.recipient.nationId,
    });
  }

  createPressSource(input: {
    name: string;
    periodId?: number;
    reachId?: number;
    pressTypeIds?: number[];
    area?: {
      nationRegionId?: number;
      clubId?: number;
      nationId?: number;
      continentId?: number;
      competitionId?: number;
      cityId?: number;
    };
    pressConference?: boolean;
  }) {
    return this.database.transaction(() => {
      const source = this.database.create("press_source", {
        name: input.name,
        period_id: input.periodId,
        reach_id: input.reachId,
        participates_in_press_conferences: input.pressConference ? 1 : 0,
      });
      for (const typeId of input.pressTypeIds ?? []) {
        this.database.create("press_source_type", { press_source_id: Number(source.id), press_type_id: typeId });
      }
      if (input.area) {
        const values = Object.fromEntries(Object.entries(input.area).filter(([, value]) => value !== undefined));
        if (Object.keys(values).length !== 1) throw new Error("Uma fonte de imprensa deve apontar para exatamente uma área.");
        this.database.create("press_source_area", { press_source_id: Number(source.id), ...values });
      }
      return source;
    });
  }

  createAward(input: {
    name: string;
    shortName?: string;
    competitionId?: number;
    awardPeriodId?: number;
    recipientTypeId?: number;
    awardTypeId?: number;
    votingTypeId?: number;
    organizerId?: number;
    positionId?: number;
    minimumAge?: number;
    maximumAge?: number;
    minimumMatchPercentage?: number;
    eligibleRecipientTypeIds?: number[];
    statisticIds?: number[];
  }) {
    return this.database.transaction(() => {
      const award = this.database.create("award", {
        name: input.name,
        short_name: input.shortName,
        competition_id: input.competitionId,
        award_period_id: input.awardPeriodId,
        recipient_type_id: input.recipientTypeId,
        award_type_id: input.awardTypeId,
        voting_type_id: input.votingTypeId,
        organizer_id: input.organizerId,
        position_id: input.positionId,
        minimum_age: input.minimumAge,
        maximum_age: input.maximumAge,
        minimum_match_percentage: input.minimumMatchPercentage,
      });
      for (const recipientTypeId of input.eligibleRecipientTypeIds ?? []) {
        this.database.create("award_eligible_recipient", { award_id: Number(award.id), recipient_type_id: recipientTypeId });
      }
      for (const statisticId of input.statisticIds ?? []) {
        this.database.create("award_used_statistic", { award_id: Number(award.id), statistic_id: statisticId });
      }
      return award;
    });
  }

  createPlayerCareerHistory(input: Record<string, SqlValue | undefined>) {
    return this.database.create("player_career_history", input);
  }

  createStaffCareerHistory(input: Record<string, SqlValue | undefined>) {
    return this.database.create("staff_career_history", input);
  }

  createPlayerAchievement(input: { playerId: number; teamId?: number; competitionId?: number; achievementTypeId: number }) {
    return this.database.create("player_achievement", {
      player_id: input.playerId,
      team_id: input.teamId,
      competition_id: input.competitionId,
      achievement_type_id: input.achievementTypeId,
    });
  }

  createRecord(input: { type: "club" | "competition"; values: Record<string, SqlValue | undefined> }) {
    return this.database.create(input.type === "club" ? "club_record" : "competition_record", input.values);
  }

  createDerby(input: { name: string; shortName?: string; clubId1: number; clubId2: number; worldReputation?: number; nationalReputation?: number }) {
    if (input.clubId1 === input.clubId2) throw new Error("Um derby exige dois clubes diferentes.");
    const [clubId1, clubId2] = [input.clubId1, input.clubId2].sort((a, b) => a - b);
    return this.database.create("derby", {
      name: input.name,
      short_name: input.shortName,
      club_id_1: clubId1,
      club_id_2: clubId2,
      world_reputation: input.worldReputation,
      national_reputation: input.nationalReputation,
    });
  }

  mapClimateToRegion(nationRegionId: number, climateId: number) {
    return this.database.create("climate_nation_region", { nation_region_id: nationRegionId, climate_id: climateId });
  }

  createWeatherSeason(name: string) {
    return this.database.create("weather_season", { name: name.trim() });
  }

  createClimateProfile(input: Record<string, SqlValue | undefined>) {
    return this.database.create("climate_season_profile", input);
  }

  createNationalityRule(input: Record<string, SqlValue | undefined>) {
    return this.database.create("nationality_rule", input);
  }
}
