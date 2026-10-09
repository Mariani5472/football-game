import type { SqlRow } from "../../../database/Database.js";
import type { WorldDatabase } from "../../../database/world/WorldDatabase.js";
import type { ContractClauseInput, ContractInput, ContractRepository } from "../domain/ContractRepository.js";

export class SqliteContractRepository implements ContractRepository {
  constructor(private readonly database: WorldDatabase) {}

  transaction<T>(operation: () => T): T { return this.database.transaction(operation); }

  createContract(input: ContractInput): SqlRow {
    return this.database.create("person_contract", {
      person_id: input.personId,
      club_id: input.clubId,
      employment_id: input.employmentId,
      start_date: input.startDate,
      end_date: input.endDate,
      contract_type: input.contractType,
      salary: input.salary,
      squad_number: input.squadNumber,
    });
  }

  createClause(contractId: number, clause: ContractClauseInput): void {
    this.database.create("player_contract_clause", {
      contract_id: contractId,
      clause_type_id: clause.clauseTypeId,
      value: clause.value,
      percentage: clause.percentage,
      target_club_id: clause.targetClubId,
      condition_id: clause.conditionId,
      target_quantity: clause.targetQuantity,
    });
  }
}
