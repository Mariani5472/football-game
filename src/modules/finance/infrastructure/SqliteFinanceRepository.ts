import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { FinanceDebtInput, FinanceInput, FinanceRepository, FinanceRevenueInput, FairPlayInput } from "../domain/FinanceRepository.js";

export class SqliteFinanceRepository implements FinanceRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(operation: () => T): T { return this.database.transaction(operation); }

  upsertClubFinance(input: FinanceInput): SqlRow {
    const current = this.database.findById<SqlRow>("club_finance", input.clubId);
    const values = {
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
    return current
      ? this.database.update("club_finance", input.clubId, values)
      : this.database.create("club_finance", values);
  }

  addEmbargoType(clubId: number, embargoTypeId: number): void {
    this.database.create("club_finance_embargo", { club_id: clubId, embargo_type_id: embargoTypeId });
  }

  addRevenue(clubId: number, revenue: FinanceRevenueInput): void {
    this.database.create("club_revenue", {
      club_id: clubId,
      total_amount: revenue.amount,
      revenue_type_id: revenue.revenueTypeId,
      start_date: revenue.startDate,
      end_date: revenue.endDate,
      renewable: revenue.renewable ? 1 : 0,
      fixed_amount: revenue.fixedAmount ? 1 : 0,
    });
  }

  addDebt(clubId: number, debt: FinanceDebtInput): void {
    this.database.create("club_debt", {
      club_id: clubId,
      original_amount: debt.amount,
      debt_source_id: debt.debtSourceId,
      start_date: debt.startDate,
      end_date: debt.endDate,
      interest_rate: debt.interestRate,
    });
  }

  addFairPlayRecord(clubId: number, input: FairPlayInput): void {
    this.database.create("financial_fair_play_record", {
      club_id: clubId,
      amount: input.amount,
      year: input.year,
      competition_id: input.competitionId,
    });
  }
}
