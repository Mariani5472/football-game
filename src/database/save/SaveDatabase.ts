import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SAVE_SCHEMA } from "./SaveSchema.js";

export class SaveDatabase {
  private readonly db: Database.Database;

  constructor(
    readonly filePath: string,
  ) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SAVE_SCHEMA);
  }

  get connection(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}