import fs from "node:fs";
import path from "node:path";
import { SaveDatabase } from "../../database/save/SaveDatabase.js";
import { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { CareerCalendarService } from "../../world/services/CareerCalendarService.js";

const root = process.cwd();
const savePath = path.resolve(root, process.argv[2] ?? "save/career.db");
const mode = process.argv[3] ?? "next";
const targetDate = process.argv[4];
const worldPath = path.resolve(root, process.env.WORLD_DB ?? "save/world.db");

if (!fs.existsSync(savePath)) throw new Error(`Save not found: ${savePath}`);
if (!fs.existsSync(worldPath)) throw new Error(`World not found: ${worldPath}`);

const save = SaveDatabase.open(savePath);
const world = WorldDatabase.open(worldPath);
try {
  const saveRow = save.connection.prepare("SELECT id FROM save ORDER BY id LIMIT 1").get() as { id: number } | undefined;
  if (!saveRow) throw new Error("Save database does not contain a career.");
  const calendar = new CareerCalendarService(save, world);
  const results = mode === "until"
    ? calendar.simulateUntil(saveRow.id, targetDate ?? (() => { throw new Error("Pass a target date as the fourth argument."); })())
    : mode === "next"
      ? [calendar.advanceToNextDate(saveRow.id)]
      : (() => { throw new Error(`Unsupported mode: ${mode}. Use next or until.`); })();

  for (const result of results) {
    console.log(`${result.previousDate} -> ${result.currentDate}: ${result.fixturesPlayed} match(es), ${result.fixturesPending} pending, ${result.elapsedMs.toFixed(2)} ms`);
  }
} finally {
  save.close();
  world.close();
}
