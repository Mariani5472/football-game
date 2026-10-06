import type { SqlRow } from "../../../database/Database.js";

export interface StadiumRepository {
  transaction<T>(work: () => T): T;
  duplicate(stadiumId: number): SqlRow;
}

