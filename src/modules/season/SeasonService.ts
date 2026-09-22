import fs from "node:fs";
import { SaveDatabase } from "../../database/save/SaveDatabase.js";

export interface CreateSaveInput {
  name: string;
  filePath: string;
  startDate: string;
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
        input.startDate,
      );

    return database;
  }

  getCurrentDate(database: SaveDatabase): string {
    const row = database.connection
      .prepare(`
        SELECT current_date AS currentDate
        FROM save
        LIMIT 1
      `)
      .get() as { currentDate: string } | undefined;

    if (!row) {
      throw new Error("Save não encontrada.");
    }

    return row.currentDate;
  }

  advanceDay(database: SaveDatabase): string {
    const currentDate = this.getCurrentDate(database);
    const nextDate = this.addDays(currentDate, 1);

    return this.setCurrentDate(database, nextDate);
  }

  setCurrentDate(
    database: SaveDatabase,
    date: string,
  ): string {
    database.connection
      .prepare(`
        UPDATE save
        SET current_date = ?
      `)
      .run(date);

    return date;
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + days);

    return value.toISOString().slice(0, 10);
  }
}
