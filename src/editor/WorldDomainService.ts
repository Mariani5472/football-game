import type { SqlValue } from "../database/Database.js";
import { CreateContract } from "../modules/career/application/CreateContract.js";
import { SqliteContractRepository } from "../modules/career/infrastructure/SqliteContractRepository.js";
import type { ContractInput } from "../modules/career/domain/ContractRepository.js";
export type { ContractInput } from "../modules/career/domain/ContractRepository.js";
import { SaveClubFinance } from "../modules/finance/application/SaveClubFinance.js";
import { SqliteFinanceRepository } from "../modules/finance/infrastructure/SqliteFinanceRepository.js";
import type { FinanceInput } from "../modules/finance/domain/FinanceRepository.js";
export type { FinanceInput } from "../modules/finance/domain/FinanceRepository.js";
import { CreateTransfer } from "../modules/transfer/application/CreateTransfer.js";
import { SqliteTransferRepository } from "../modules/transfer/infrastructure/SqliteTransferRepository.js";
import type { TransferInput } from "../modules/transfer/domain/TransferRepository.js";
export type { TransferInput } from "../modules/transfer/domain/TransferRepository.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import { CreateClub } from "../modules/club/application/CreateClub.js";
import { SqliteClubRepository } from "../modules/club/infrastructure/SqliteClubRepository.js";
import type { ClubCreationData } from "../modules/club/domain/ClubRepository.js";
import { CreatePlayer } from "../modules/player/application/CreatePlayer.js";
import { SqlitePlayerRepository } from "../modules/player/infrastructure/SqlitePlayerRepository.js";
import type { PlayerCreationData } from "../modules/player/domain/PlayerRepository.js";
import { CreateLeague } from "../modules/competition/application/CreateLeague.js";
import { SqliteLeagueRepository } from "../modules/competition/infrastructure/SqliteLeagueRepository.js";
import { CreateCompetitionStage } from "../modules/competition/application/CreateCompetitionStage.js";
import { UpdateCompetitionStage } from "../modules/competition/application/UpdateCompetitionStage.js";
import { SqliteStageConfigurationRepository } from "../modules/competition/infrastructure/SqliteStageConfigurationRepository.js";
import type { CompetitionStageSetup } from "../modules/competition/domain/StageConfigurationRepository.js";
import type { LeagueSetup } from "../modules/competition/domain/LeagueRepository.js";
import { RecordCompetitionHistory } from "../modules/competition/application/RecordCompetitionHistory.js";
import { SqliteCompetitionHistoryRepository } from "../modules/competition/infrastructure/SqliteCompetitionHistoryRepository.js";
import type { CompetitionHistoryInput } from "../modules/competition/domain/CompetitionHistoryRepository.js";
export type { CompetitionHistoryInput } from "../modules/competition/domain/CompetitionHistoryRepository.js";
import { DuplicateStadium } from "../modules/stadium/application/DuplicateStadium.js";
import { SqliteStadiumRepository } from "../modules/stadium/infrastructure/SqliteStadiumRepository.js";

export class WorldDomainService {
  constructor(private readonly database: WorldDatabase) {}

  duplicateStadium(stadiumId: number) {
    return new DuplicateStadium(new SqliteStadiumRepository(this.database)).execute(stadiumId);
  }

  createClub(input: ClubCreationData) {
    return new CreateClub(new SqliteClubRepository(this.database)).execute(input);
  }

  createPlayer(input: PlayerCreationData) {
    return new CreatePlayer(new SqlitePlayerRepository(this.database)).execute(input);
  }
  createLeague(input: LeagueSetup) {
    return new CreateLeague(new SqliteLeagueRepository(this.database)).execute(input);
  }
  createCompetitionStage(input: CompetitionStageSetup) {
    return new CreateCompetitionStage(new SqliteStageConfigurationRepository(this.database)).execute(input);
  }
  updateCompetitionStage(stageId: number, input: CompetitionStageSetup) {
    return new UpdateCompetitionStage(new SqliteStageConfigurationRepository(this.database)).execute(stageId, input);
  }

  createTransfer(input: TransferInput) {
    return new CreateTransfer(new SqliteTransferRepository(this.database)).execute(input);
  }

  createContract(input: ContractInput) {
    return new CreateContract(new SqliteContractRepository(this.database)).execute(input);
  }

  saveClubFinance(input: FinanceInput) {
    return new SaveClubFinance(new SqliteFinanceRepository(this.database)).execute(input);
  }

  createCompetitionHistory(input: CompetitionHistoryInput) {
    return new RecordCompetitionHistory(new SqliteCompetitionHistoryRepository(this.database)).execute(input);
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
        this.database.create("press_source_type", {
          press_source_id: Number(source.id),
          press_type_id: typeId,
        });
      }

      if (input.area) {
        const values = Object.fromEntries(
          Object.entries(input.area).filter(([, value]) => value !== undefined),
        );
        if (Object.keys(values).length !== 1) {
          throw new Error("Uma fonte de imprensa deve apontar para exatamente uma área.");
        }
        this.database.create("press_source_area", {
          press_source_id: Number(source.id),
          ...values,
        });
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

  createPlayerAchievement(input: {
    playerId: number;
    teamId?: number;
    competitionId?: number;
    achievementTypeId: number;
  }) {
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

  createDerby(input: {
    name: string;
    shortName?: string;
    clubId1: number;
    clubId2: number;
    worldReputation?: number;
    nationalReputation?: number;
  }) {
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
    return this.database.create("climate_nation_region", {
      nation_region_id: nationRegionId,
      climate_id: climateId,
    });
  }

  createWeatherSeason(name: string) {
    return this.database.create("weather_season", { name: name.trim() });
  }

  createClimateProfile(input: {
    climateId: number;
    seasonId: number;
    startDay?: number;
    rainDry?: number;
    rainHumid?: number;
    rainDrizzle?: number;
    rainShower?: number;
    windCalm?: number;
    windBreeze?: number;
    windWindy?: number;
    windStrong?: number;
    windStorm?: number;
    temperatureProfile?: Record<string, number>;
    dayNightVariation?: boolean;
    dayNightVariationValue?: number;
  }) {
    return this.database.create("climate_season_profile", {
      climate_id: input.climateId,
      season_id: input.seasonId,
      start_day: input.startDay,
      rain_dry: input.rainDry,
      rain_humid: input.rainHumid,
      rain_drizzle: input.rainDrizzle,
      rain_shower: input.rainShower,
      wind_calm: input.windCalm,
      wind_breeze: input.windBreeze,
      wind_windy: input.windWindy,
      wind_strong: input.windStrong,
      wind_storm: input.windStorm,
      ...input.temperatureProfile,
      day_night_variation: input.dayNightVariation ? 1 : 0,
      day_night_variation_value: input.dayNightVariationValue,
    });
  }

  createNationalityRule(input: {
    nationId: number;
    ruleType: string;
    value?: number;
    requiredNationId?: number;
    cumulative?: boolean;
    enabled?: boolean;
    eligibility?: {
      minimumAge?: number;
      maximumAge?: number;
      yearsRequired?: number;
      matchesRequired?: number;
    };
    treatment?: {
      targetNationId: number;
      treatmentType: string;
      value?: number;
    };
  }) {
    return this.database.transaction(() => {
      const rule = this.database.create("nationality_rule", {
        nation_id: input.nationId,
        rule_type: input.ruleType,
        value: input.value,
        required_nation_id: input.requiredNationId,
        cumulative: input.cumulative ? 1 : 0,
        enabled: input.enabled === false ? 0 : 1,
      });

      if (input.eligibility) {
        this.database.create("nationality_eligibility_rule", {
          nation_id: input.nationId,
          rule_type: input.ruleType,
          minimum_age: input.eligibility.minimumAge,
          maximum_age: input.eligibility.maximumAge,
          years_required: input.eligibility.yearsRequired,
          matches_required: input.eligibility.matchesRequired,
          required_nation_id: input.requiredNationId,
        });
      }

      if (input.treatment) {
        this.database.create("nation_treatment_rule", {
          root_nation_id: input.nationId,
          target_nation_id: input.treatment.targetNationId,
          treatment_type: input.treatment.treatmentType,
          value: input.treatment.value,
        });

        if (input.treatment.treatmentType.toUpperCase() === "NATIVE") {
          this.database.connection.prepare(
            "INSERT OR IGNORE INTO nation_native_treatment (root_nation_id, target_nation_id) VALUES (?, ?)",
          ).run(input.nationId, input.treatment.targetNationId);
        }
      }

      return rule;
    });
  }
}
