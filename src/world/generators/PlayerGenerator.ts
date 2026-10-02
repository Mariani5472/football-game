import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import type { GenerationContext } from "./GenerationContext.js";

export class PlayerGenerator {
  constructor(
    private readonly database: WorldDatabase,
  ) {}

  generateSandbox(
    context: GenerationContext,
  ): void {
    const insertPlayer = this.database.connection.prepare(
      `
        INSERT INTO player (
          person_id,
          potential_capacity,
          potential,
          estimated_value,
          left_foot,
          right_foot
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    );

    const insertTechnicalAttributes =
      this.database.connection.prepare(
        `
          INSERT INTO player_technical_attribute (
            player_id,
            corners,
            crossing,
            dribbling,
            finishing,
            first_touch,
            free_kicks,
            heading,
            long_shots,
            long_throws,
            marking,
            passing,
            penalties,
            tackling,
            technique,
            versatility
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
          )
        `,
      );

    const insertPhysicalAttributes =
      this.database.connection.prepare(
        `
          INSERT INTO player_physical_attribute (
            player_id,
            acceleration,
            agility,
            balance,
            injury_proneness,
            jumping_reach,
            fitness,
            pace,
            stamina,
            strength
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );

    const insertPsychologicalAttributes =
      this.database.connection.prepare(
        `
          INSERT INTO player_psychological_attribute (
            player_id,
            aggression,
            anticipation,
            bravery,
            composure,
            concentration,
            consistency,
            decisions,
            determination,
            dirtiness,
            unpredictability,
            important_matches,
            leadership,
            movement,
            positioning,
            teamwork,
            vision,
            work_rate
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
          )
        `,
      );

    const insertClubPeriod =
      this.database.connection.prepare(
        `
          INSERT INTO player_club_period (
            player_id,
            club_id,
            start_date
          )
          VALUES (?, ?, ?)
        `,
      );

    const insertContract =
      this.database.connection.prepare(
        `
          INSERT INTO person_contract (
            person_id,
            club_id,
            start_date,
            contract_type,
            salary
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      );

    for (const [
      index,
      personId,
    ] of context.personIds.entries()) {
      insertPlayer.run(
        personId,
        100,
        50,
        100_000,
        10,
        10,
      );

      insertTechnicalAttributes.run(
        personId,
        10, 10, 10, 10, 10, 10, 10, 10,
        10, 10, 10, 10, 10, 10, 10,
      );

      insertPhysicalAttributes.run(
        personId,
        10, 10, 10, 5, 10,
        10, 10, 10, 10,
      );

      insertPsychologicalAttributes.run(
        personId,
        10, 10, 10, 10, 10, 10, 10, 10, 10,
        10, 10, 10, 10, 10, 10, 10, 10
      );

      const clubId =
        context.clubIds[
        index % context.clubIds.length
        ];

      insertClubPeriod.run(
        personId,
        clubId,
        "2026-01-01",
      );

      insertContract.run(
        personId,
        clubId,
        "2026-01-01",
        "PLAYER",
        10_000,
      );

      context.playerIds.push(personId);
    }
  }
}
