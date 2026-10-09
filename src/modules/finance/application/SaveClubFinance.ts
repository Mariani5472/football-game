import type { FinanceInput, FinanceRepository } from "../domain/FinanceRepository.js";

export class SaveClubFinance {
  constructor(private readonly finances: FinanceRepository) {}

  execute(input: FinanceInput) {
    return this.finances.transaction(() => {
      const finance = this.finances.upsertClubFinance(input);
      for (const typeId of input.transferEmbargo?.typeIds ?? []) this.finances.addEmbargoType(input.clubId, typeId);
      for (const revenue of input.revenues ?? []) this.finances.addRevenue(input.clubId, revenue);
      for (const debt of input.debts ?? []) this.finances.addDebt(input.clubId, debt);
      if (input.ffp) this.finances.addFairPlayRecord(input.clubId, input.ffp);
      return finance;
    });
  }
}
