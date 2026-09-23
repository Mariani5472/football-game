import type Database from "better-sqlite3";

export interface World {
  saveId: number;
  name: string;
  currentDate: string;
}

export function loadWorld(db: Database.Database): World {
  const save = db
    .prepare(`
      SELECT
        id,
        name,
        "current_date" AS currentDate
      FROM save
      LIMIT 1
    `)
    .get() as | {
      id: number;
      name: string;
      currentDate: string;
    } | undefined;

  if (!save) {
    throw new Error("Save não inicializado.");
  }

  return {
    saveId: save.id,
    name: save.name,
    currentDate: save.currentDate,
  };
}