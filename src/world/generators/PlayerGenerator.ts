import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class PlayerGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const insertPlayer = this.database.connection.prepare(`
      INSERT INTO player (
        person_id,
        potential_capacity,
        potential,
        estimated_value,
        left_foot,
        right_foot
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const personId of context.personIds) {
      const result = insertPlayer.run(
        personId,
        100,
        50,
        100_000,
        10,
        10,
      );

      context.playerIds.push(personId);
    }
  }
}