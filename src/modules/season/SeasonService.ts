import fs from "node:fs";
import { SaveDatabase } from "../../database/save/SaveDatabase.js";

export interface CreateSaveInput {
  name: string;
  filePath: string;
}

export class SaveService {
  create(input: CreateSaveInput): SaveDatabase {
    if (fs.existsSync(input.filePath)) {
      throw new Error(`Save já existe: ${input.filePath}`);
    }

    const database = new SaveDatabase(input.filePath);

    database.connection
      .prepare(`
        INSERT INTO save (
          name,
          created_at,
          current_date
        )
        VALUES (?, ?, ?)
      `)
      .run(
        input.name,
        new Date().toISOString(),
        "2026-01-01",
      );

    return database;
  }
}