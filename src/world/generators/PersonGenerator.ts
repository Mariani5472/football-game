import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class PersonGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const personTypeId = this.getOrCreatePlayerPersonType();

    const insertPerson = this.database.connection.prepare(
      `
        INSERT INTO person (
          first_name,
          second_name,
          common_name,
          full_name,
          person_type_id,
          sex,
          height,
          birth_date,
          birth_city_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (let i = 0; i < 160; i++) {
      const firstName = "Player";
      const secondName = `${i + 1}`;
      const fullName = `${firstName} ${secondName}`;

      const birthCityId =
        context.cityIds[i % context.cityIds.length];

      const birthDate = this.createBirthDate(i);

      const result = insertPerson.run(
        firstName,
        secondName,
        null,
        fullName,
        personTypeId,
        "M",
        170 + (i % 20),
        birthDate,
        birthCityId,
      );

      context.personIds.push(
        Number(result.lastInsertRowid),
      );
    }
  }

  private getOrCreatePlayerPersonType(): number {
    const existing = this.database.connection
      .prepare(
        `
          SELECT id
          FROM person_type
          WHERE name = ?
          LIMIT 1
        `,
      )
      .get("PLAYER") as { id: number } | undefined;

    if (existing) {
      return existing.id;
    }

    const result = this.database.connection
      .prepare(
        `
          INSERT INTO person_type (
            name
          )
          VALUES (?)
        `,
      )
      .run("PLAYER");

    return Number(result.lastInsertRowid);
  }

  private createBirthDate(index: number): string {
    const year = 1990 + (index % 16);
    const month = String((index % 12) + 1).padStart(2, "0");
    const day = String((index % 28) + 1).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
}
