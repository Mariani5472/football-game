import type { SqlKey, SqlRow, SqlValue } from "../database/Database.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";

export interface TransferInput {
  playerId: number;
  originClubId?: number;
  destinationClubId?: number;
  transferTypeId?: number;
  transferStatusId?: number;
  transferWindowId?: number;
  transferDate?: string;
  fee?: number;
  currencyId?: number;
  permanent?: boolean;
  installments?: Array<{ directionId: number; amountPerPeriod: number; numberOfPeriods: number; intervalId: number }>;
  wageContribution?: { directionId: number; salary: number; endDate?: string };
  loan?: { startDate?: string; endDate?: string; foreign?: boolean };
  resaleClause?: { percentage?: number; targetClubFinanceId: number };
  saleClause?: { percentage?: number; targetClubFinanceId: number };
}

export interface ContractInput {
  personId: number;
  clubId: number;
  employmentId?: number;
  startDate?: string;
  endDate?: string;
  contractType?: string;
  salary?: number;
  squadNumber?: number;
  clauses?: Array<{ clauseTypeId: number; value?: number; percentage?: number; targetClubId?: number; conditionId?: number; targetQuantity?: number }>;
}

export interface FinanceInput {
  clubId: number;
  balance?: number;
  transferBudget?: number;
  wageBudget?: number;
  monthlyWageBudget?: number;
  patronTypeId?: number;
  transferEmbargo?: { startDate?: string; endDate?: string; appealDate?: string; ageRestriction?: number; typeIds?: number[] };
  revenues?: Array<{ amount: number; revenueTypeId: number; startDate?: string; endDate?: string; renewable?: boolean; fixedAmount?: boolean }>;
  debts?: Array<{ amount: number; debtSourceId: number; startDate?: string; endDate?: string; interestRate?: number }>;
  ffp?: { amount: number; year: number; competitionId: number };
}

export class WorldDomainService {
  constructor(private readonly database: WorldDatabase) {}

  createTransfer(input: TransferInput) {
    return this.database.transaction(() => {
      if (input.originClubId && input.destinationClubId && input.originClubId === input.destinationClubId) {
        throw new Error("O clube de origem e o clube de destino devem ser diferentes.");
      }

      const date = input.transferDate ?? new Date().toISOString().slice(0, 10);
      if (input.transferWindowId) {
        const window = this.database.findById<SqlRow>("transfer_window", input.transferWindowId);
        if (!window) throw new Error("Janela de transferência não encontrada.");
        if (String(date) < String(window.start_date) || String(date) > String(window.end_date)) {
          throw new Error("A data da transferência está fora da janela selecionada.");
        }
      }

      const transfer = this.database.create("transfer", {
        player_id: input.playerId,
        origin_club_id: input.originClubId,
        target_club_id: input.destinationClubId,
        transfer_date: date,
        transfer_value: input.fee,
      });

      const playerTransfer = this.database.create("player_transfer", {
        player_id: input.playerId,
        origin_club_id: input.originClubId,
        destination_club_id: input.destinationClubId,
        transfer_type_id: input.transferTypeId,
        transfer_status_id: input.transferStatusId,
        transfer_window_id: input.transferWindowId,
        transfer_date: date,
        fee: input.fee,
        currency_id: input.currencyId,
        permanent: input.permanent === false ? 0 : 1,
      });

      if (input.installments?.length && input.originClubId && input.destinationClubId) {
        for (const item of input.installments) {
          this.database.create("installment", {
            origin_club_finance_id: input.originClubId,
            direction_id: item.directionId,
            player_id: input.playerId,
            target_club_finance_id: input.destinationClubId,
            amount_per_period: item.amountPerPeriod,
            number_of_periods: item.numberOfPeriods,
            interval_id: item.intervalId,
            transfer_id: transfer.id,
          });
        }
      }

      if (input.wageContribution && input.originClubId && input.destinationClubId) {
        this.database.create("wage_contribution", {
          origin_club_finance_id: input.originClubId,
          direction_id: input.wageContribution.directionId,
          player_id: input.playerId,
          target_club_finance_id: input.destinationClubId,
          salary: input.wageContribution.salary,
          end_date: input.wageContribution.endDate,
          transfer_id: transfer.id,
        });
      }

      if (input.loan && input.originClubId && input.destinationClubId) {
        this.database.create("loaned_player", {
          root_club_id: input.originClubId,
          player_id: input.playerId,
          target_club_id: input.destinationClubId,
          start_date: input.loan.startDate,
          end_date: input.loan.endDate,
          is_foreign: input.loan.foreign ? 1 : 0,
        });
      }

      if (input.resaleClause && input.originClubId && input.destinationClubId) {
        this.database.create("resale_clause", {
          origin_club_finance_id: input.originClubId,
          player_id: input.playerId,
          target_club_finance_id: input.resaleClause.targetClubFinanceId,
          resale_commission: input.resaleClause.percentage,
          transfer_id: transfer.id,
        });
      }

      if (input.saleClause && input.originClubId && input.destinationClubId) {
        this.database.create("sale_clause", {
          origin_club_finance_id: input.originClubId,
          player_id: input.playerId,
          target_club_finance_id: input.saleClause.targetClubFinanceId,
          resale_percentage: input.saleClause.percentage,
          transfer_id: transfer.id,
        });
      }

      return { transfer, playerTransfer };
    });
  }

  createContract(input: ContractInput) {
    return this.database.transaction(() => {
      const contract = this.database.create("person_contract", {
        person_id: input.personId,
        club_id: input.clubId,
        employment_id: input.employmentId,
        start_date: input.startDate,
        end_date: input.endDate,
        contract_type: input.contractType,
        salary: input.salary,
        squad_number: input.squadNumber,
      });

      for (const clause of input.clauses ?? []) {
        this.database.create("player_contract_clause", {
          contract_id: contract.id,
          clause_type_id: clause.clauseTypeId,
          value: clause.value,
          percentage: clause.percentage,
          target_club_id: clause.targetClubId,
          condition_id: clause.conditionId,
          target_quantity: clause.targetQuantity,
        });
      }

      return contract;
    });
  }

  saveClubFinance(input: FinanceInput) {
    return this.database.transaction(() => {
      const current = this.database.findById<SqlRow>("club_finance", input.clubId);
      const financeValues = {
        club_id: input.clubId,
        balance: input.balance,
        transfer_budget: input.transferBudget,
        wage_budget: input.wageBudget,
        monthly_wage_budget: input.monthlyWageBudget,
        patron_type_id: input.patronTypeId,
        has_transfer_embargo: input.transferEmbargo ? 1 : 0,
        transfer_embargo_start_date: input.transferEmbargo?.startDate,
        transfer_embargo_end_date: input.transferEmbargo?.endDate,
        transfer_embargo_appeal_date: input.transferEmbargo?.appealDate,
        embargo_age_restriction: input.transferEmbargo?.ageRestriction,
      };

      const finance = current
        ? this.database.update("club_finance", input.clubId, financeValues)
        : this.database.create("club_finance", financeValues);

      if (input.transferEmbargo?.typeIds) {
        for (const typeId of input.transferEmbargo.typeIds) {
          this.database.create("club_finance_embargo", {
            club_id: input.clubId,
            embargo_type_id: typeId,
          });
        }
      }

      for (const revenue of input.revenues ?? []) {
        this.database.create("club_revenue", {
          club_id: input.clubId,
          total_amount: revenue.amount,
          revenue_type_id: revenue.revenueTypeId,
          start_date: revenue.startDate,
          end_date: revenue.endDate,
          renewable: revenue.renewable ? 1 : 0,
          fixed_amount: revenue.fixedAmount ? 1 : 0,
        });
      }

      for (const debt of input.debts ?? []) {
        this.database.create("club_debt", {
          club_id: input.clubId,
          original_amount: debt.amount,
          debt_source_id: debt.debtSourceId,
          start_date: debt.startDate,
          end_date: debt.endDate,
          interest_rate: debt.interestRate,
        });
      }

      if (input.ffp) {
        this.database.create("financial_fair_play_record", {
          club_id: input.clubId,
          amount: input.ffp.amount,
          year: input.ffp.year,
          competition_id: input.ffp.competitionId,
        });
      }

      return finance;
    });
  }

  createCompetitionHistory(input: {
    competitionId: number;
    year: number;
    positionTeams?: number[];
    hosts?: Array<{ nationId?: number; stadiumId?: number }>;
    position?: number;
    clubId?: number;
    clubStats?: Record<string, number>;
  }) {
    return this.database.transaction(() => {
      const history = this.database.create("competition_history", {
        competition_id: input.competitionId,
        year: input.year,
      });

      for (const [index, teamId] of (input.positionTeams ?? []).slice(0, 3).entries()) {
        this.database.create("competition_history_team", {
          competition_history_id: history.id,
          team_id: teamId,
          slot_number: index + 1,
        });
      }

      for (const [index, host] of (input.hosts ?? []).slice(0, 3).entries()) {
        this.database.create("competition_history_host", {
          competition_history_id: history.id,
          nation_id: host.nationId,
          stadium_id: host.stadiumId,
          slot_number: index + 1,
        });
      }

      if (input.clubId) {
        this.database.create("club_competition_history", {
          club_id: input.clubId,
          competition_id: input.competitionId,
          year: input.year,
          position: input.position,
          ...input.clubStats,
        });
      }

      return history;
    });
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
          press_source_id: source.id,
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
          press_source_id: source.id,
          ...values,
        });
      }

      return source;
    });
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
      }

      return rule;
    });
  }
}
