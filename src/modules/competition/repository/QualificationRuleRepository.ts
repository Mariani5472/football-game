import type Database from "better-sqlite3";

import type {
  QualificationRule,
  QualificationType,
} from "../domain/QualificationRule.js";

export class QualificationRuleRepository {
  constructor(private readonly db: Database.Database,) {}

  findByStage(stageId: number): QualificationRule[] {
    return this.db
      .prepare(`
        SELECT
          id,
          stage_id AS stageId,
          position_from AS positionFrom,
          position_to AS positionTo,
          qualification_type AS qualificationType,
          destination
        FROM qualification_rule
        WHERE stage_id = ?
        ORDER BY position_from ASC
      `)
      .all(stageId) as QualificationRule[];
  }

  create(
    stageId: number,
    rules: Array<{
      positionFrom: number;
      positionTo: number;
      qualificationType: QualificationType;
      destination: string;
    }>,
  ): void {
    const insert = this.db.prepare(`
      INSERT INTO qualification_rule (
        stage_id,
        position_from,
        position_to,
        qualification_type,
        destination
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const rule of rules) {
        insert.run(
          stageId,
          rule.positionFrom,
          rule.positionTo,
          rule.qualificationType,
          rule.destination,
        );
      }
    });

    transaction();
  }
}