import type Database from "better-sqlite3";

import { QualificationRuleRepository } from "../repository/QualificationRuleRepository.js";
import type { Standing } from "./StandingEngine.js";

export interface Qualification {
  teamId: number;
  position: number;
  type: "QUALIFIED" | "RELEGATED";
  destination: string;
}

export class QualificationEngine {
  private readonly repository: QualificationRuleRepository;

  constructor(private readonly db: Database.Database,) {
    this.repository = new QualificationRuleRepository(db);
  }

  resolve(
    stageId: number,
    standings: Standing[],
  ): Qualification[] {
    const rules = this.repository.findByStage(stageId);
    const qualifications: Qualification[] = [];

    standings.forEach((standing, index) => {
      const position = index + 1;

      const rule = rules.find((rule) =>
        position >= rule.positionFrom &&
        position <= rule.positionTo,
      );

      if (!rule) {
        return;
      }

      qualifications.push({
        teamId: standing.teamId,
        position,
        type: rule.qualificationType,
        destination: rule.destination,
      });
    });

    return qualifications;
  }
}