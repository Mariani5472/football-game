import type Database from "better-sqlite3";

import type {
  StandingRule,
  StandingRuleType,
} from "../domain/StandingRule.js";

export class StandingRuleRepository {
  constructor(
    private readonly db: Database.Database,
  ) {}

  findByStage(stageId: number,): StandingRule[] {
    return this.db
      .prepare(`
        SELECT
          id,
          stage_id AS stageId,
          rule_order AS ruleOrder,
          rule_type AS ruleType
        FROM standing_rule
        WHERE stage_id = ?
        ORDER BY rule_order ASC
      `)
      .all(stageId) as StandingRule[];
  }

  create(stageId: number, rules: StandingRuleType[],): void {
    const insert = this.db.prepare(`
      INSERT INTO standing_rule (
        stage_id,
        rule_order,
        rule_type
      )
      VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction(
      (ruleTypes: StandingRuleType[]) => {
        ruleTypes.forEach((ruleType, index) => {
          insert.run(
            stageId,
            index + 1,
            ruleType,
          );
        });
      },
    );

    transaction(rules);
  }
}