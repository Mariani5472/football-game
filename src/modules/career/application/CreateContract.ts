import type { ContractInput, ContractRepository } from "../domain/ContractRepository.js";

export class CreateContract {
  constructor(private readonly contracts: ContractRepository) {}

  execute(input: ContractInput) {
    return this.contracts.transaction(() => {
      const contract = this.contracts.createContract(input);
      const contractId = Number(contract.id);
      for (const clause of input.clauses ?? []) this.contracts.createClause(contractId, clause);
      return contract;
    });
  }
}
