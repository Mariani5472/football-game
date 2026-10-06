export interface FinanceRevenueInput {
  amount: number;
  revenueTypeId: number;
  startDate?: string;
  endDate?: string;
  renewable?: boolean;
  fixedAmount?: boolean;
}

export interface FinanceDebtInput {
  amount: number;
  debtSourceId: number;
  startDate?: string;
  endDate?: string;
  interestRate?: number;
}

export interface TransferEmbargoInput {
  startDate?: string;
  endDate?: string;
  appealDate?: string;
  ageRestriction?: number;
  typeIds?: number[];
}

export interface FairPlayInput { amount: number; year: number; competitionId: number }

export interface FinanceInput {
  clubId: number;
  balance?: number;
  transferBudget?: number;
  wageBudget?: number;
  monthlyWageBudget?: number;
  patronTypeId?: number;
  transferEmbargo?: TransferEmbargoInput;
  revenues?: FinanceRevenueInput[];
  debts?: FinanceDebtInput[];
  ffp?: FairPlayInput;
}

export interface FinanceRepository {
  transaction<T>(operation: () => T): T;
  upsertClubFinance(input: FinanceInput): Record<string, unknown>;
  addEmbargoType(clubId: number, embargoTypeId: number): void;
  addRevenue(clubId: number, revenue: FinanceRevenueInput): void;
  addDebt(clubId: number, debt: FinanceDebtInput): void;
  addFairPlayRecord(clubId: number, input: FairPlayInput): void;
}
