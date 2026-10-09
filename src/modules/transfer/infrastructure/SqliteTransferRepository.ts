import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { TransferInput, TransferRepository, TransferWindow } from "../domain/TransferRepository.js";

export class SqliteTransferRepository implements TransferRepository {
  constructor(private readonly database: WorldDatabase) {}

  findWindow(id: number): TransferWindow | null {
    const row = this.database.findById<SqlRow>("transfer_window", id);
    return row ? { startDate: String(row.start_date), endDate: String(row.end_date) } : null;
  }

  persist(input: TransferInput, date: string) {
    return this.database.transaction(() => {
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
        for (const item of input.installments) this.database.create("installment", {
          origin_club_finance_id: input.originClubId, direction_id: item.directionId, player_id: input.playerId,
          target_club_finance_id: input.destinationClubId, amount_per_period: item.amountPerPeriod,
          number_of_periods: item.numberOfPeriods, interval_id: item.intervalId, transfer_id: Number(transfer.id),
        });
      }
      if (input.wageContribution && input.originClubId && input.destinationClubId) this.database.create("wage_contribution", {
        origin_club_finance_id: input.originClubId, direction_id: input.wageContribution.directionId,
        player_id: input.playerId, target_club_finance_id: input.destinationClubId,
        salary: input.wageContribution.salary, end_date: input.wageContribution.endDate, transfer_id: Number(transfer.id),
      });
      if (input.loan && input.originClubId && input.destinationClubId) this.database.create("loaned_player", {
        root_club_id: input.originClubId, player_id: input.playerId, target_club_id: input.destinationClubId,
        start_date: input.loan.startDate, end_date: input.loan.endDate, is_foreign: input.loan.foreign ? 1 : 0,
      });
      if (input.resaleClause && input.originClubId && input.destinationClubId) this.database.create("resale_clause", {
        origin_club_finance_id: input.originClubId, player_id: input.playerId,
        target_club_finance_id: input.resaleClause.targetClubFinanceId,
        resale_commission: input.resaleClause.percentage, transfer_id: Number(transfer.id),
      });
      if (input.saleClause && input.originClubId && input.destinationClubId) this.database.create("sale_clause", {
        origin_club_finance_id: input.originClubId, player_id: input.playerId,
        target_club_finance_id: input.saleClause.targetClubFinanceId,
        resale_percentage: input.saleClause.percentage, transfer_id: Number(transfer.id),
      });
      return { transfer, playerTransfer };
    });
  }
}

