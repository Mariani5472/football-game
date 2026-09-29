import DatabaseConnection from "better-sqlite3";

export type TransactionCallback<T> = () => T;

export abstract class Database {
  protected constructor(
    protected readonly db: DatabaseConnection.Database
  ) {
    this.db.pragma("foreign_keys = ON");
  }

  get connection(): DatabaseConnection.Database {
    return this.db;
  }

  execute(sql: string): DatabaseConnection.RunResult {
    return this.db.prepare(sql).run();
  }

  transaction<T>(callback: TransactionCallback<T>): T {
    return this.db.transaction(callback)();
  }

  close(): void {
    if (this.db.open) this.db.close();
  }
}