import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class LanguageGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const family = this.database.connection
      .prepare(`
        INSERT INTO language_family (name)
        VALUES (?)
      `)
      .run("Sandbox Language Family");

    const familyId = Number(
      family.lastInsertRowid,
    );

    const group = this.database.connection
      .prepare(`
        INSERT INTO language_group (
          family_id,
          name
        )
        VALUES (?, ?)
      `)
      .run(
        familyId,
        "Sandbox Language Group",
      );

    const groupId = Number(
      group.lastInsertRowid,
    );

    const language = this.database.connection
      .prepare(`
        INSERT INTO language (
          name,
          family_id,
          group_id
        )
        VALUES (?, ?, ?)
      `)
      .run(
        "Sandbox",
        familyId,
        groupId,
      );

    context.languageId = Number(
      language.lastInsertRowid,
    );
  }
}