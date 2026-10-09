export interface ContractClauseInput {
  clauseTypeId: number;
  value?: number;
  percentage?: number;
  targetClubId?: number;
  conditionId?: number;
  targetQuantity?: number;
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
  clauses?: ContractClauseInput[];
}

export interface ContractRepository {
  transaction<T>(operation: () => T): T;
  createContract(input: ContractInput): Record<string, unknown>;
  createClause(contractId: number, clause: ContractClauseInput): void;
}
