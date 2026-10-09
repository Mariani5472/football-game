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

export interface TransferWindow { startDate: string; endDate: string }

export interface TransferRepository {
  findWindow(id: number): TransferWindow | null;
  persist(input: TransferInput, date: string): { transfer: unknown; playerTransfer: unknown };
}
