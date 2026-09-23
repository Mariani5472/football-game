import type Database from "better-sqlite3";

import type { MatchResult } from "../../match/domain/MatchResult.js";
import type { StandingRuleType } from "../domain/StandingRule.js";
import { StandingRuleRepository } from "../repository/StandingRuleRepository.js";

export interface Standing {
  teamId: number;
  teamName: string;

  played: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;

  points: number;
}

export class StandingEngine {
  private readonly ruleRepository: StandingRuleRepository;

  constructor(private readonly db: Database.Database,) {
    this.ruleRepository = new StandingRuleRepository(db);
  }

  initialize(stageId: number, teamIds: number[],): void {
    const insert = this.db.prepare(`
      INSERT INTO standing (
        stage_id,
        team_id
      )
      VALUES (?, ?)
    `);

    const transaction = this.db.transaction((ids: number[]) => {
      for (const teamId of ids) {
        insert.run(stageId, teamId,);
      }
    },);

    transaction(teamIds);
  }

  getStandings(stageId: number,): Standing[] {
    const rules = this.ruleRepository.findByStage(stageId,);

    if (!rules.length) {
      throw new Error(`Nenhuma regra de classificação encontrada para o stage ${stageId}.`,);
    }

    const orderBy = rules
      .map((rule) => this.getOrderExpression(rule.ruleType))
      .join(", ");

    const query = `
      SELECT
        s.team_id AS teamId,
        t.name AS teamName,

        s.played,

        s.wins,
        s.draws,
        s.losses,

        s.goals_for AS goalsFor,
        s.goals_against AS goalsAgainst,

        (s.goals_for - s.goals_against) AS goalDifference,

        s.points

      FROM standing s

      INNER JOIN team t
        ON t.id = s.team_id

      WHERE s.stage_id = ?

      ORDER BY
        ${orderBy},
        t.name ASC
    `;

    return this.db
      .prepare(query)
      .all(stageId) as Standing[];
  }

  applyResult(
    stageId: number,
    result: MatchResult,
  ): void {
    const home = this.getStanding(
      stageId,
      result.homeTeamId,
    );

    const away = this.getStanding(
      stageId,
      result.awayTeamId,
    );

    home.played++;
    away.played++;

    home.goalsFor += result.homeGoals;
    home.goalsAgainst += result.awayGoals;

    away.goalsFor += result.awayGoals;
    away.goalsAgainst += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      home.wins++;
      away.losses++;

      home.points += 3;
    } else if (result.homeGoals < result.awayGoals) {
      away.wins++;
      home.losses++;

      away.points += 3;
    } else {
      home.draws++;
      away.draws++;

      home.points++;
      away.points++;
    }

    this.update(home);
    this.update(away);
  }

  private getOrderExpression(
    rule: StandingRuleType,
  ): string {
    switch (rule) {
      case "POINTS":
        return "s.points DESC";

      case "GOAL_DIFFERENCE":
        return "goalDifference DESC";

      case "GOALS_FOR":
        return "s.goals_for DESC";

      case "WINS":
        return "s.wins DESC";

      case "HEAD_TO_HEAD":
        throw new Error(
          "Regra HEAD_TO_HEAD ainda não implementada.",
        );

      case "FAIR_PLAY":
        throw new Error(
          "Regra FAIR_PLAY ainda não implementada.",
        );

      case "COEFFICIENT":
        throw new Error(
          "Regra COEFFICIENT ainda não implementada.",
        );

      default:
        throw new Error(
          `Regra de classificação desconhecida: ${rule}`,
        );
    }
  }

  private getStanding(stageId: number, teamId: number,): StandingRow {
    const row = this.db
      .prepare(`
        SELECT
          id,
          stage_id AS stageId,
          team_id AS teamId,

          played,

          wins,
          draws,
          losses,

          goals_for AS goalsFor,
          goals_against AS goalsAgainst,

          points

        FROM standing

        WHERE stage_id = ?
          AND team_id = ?
      `)
      .get(
        stageId,
        teamId,
      ) as StandingRow | undefined;

    if (!row) {
      throw new Error(`Standing não encontrada para team=${teamId}`,);
    }

    return row;
  }

  private update(row: StandingRow,): void {
    this.db
      .prepare(`
        UPDATE standing
        SET
          played = ?,

          wins = ?,
          draws = ?,
          losses = ?,

          goals_for = ?,
          goals_against = ?,

          points = ?

        WHERE id = ?
      `)
      .run(
        row.played,

        row.wins,
        row.draws,
        row.losses,

        row.goalsFor,
        row.goalsAgainst,

        row.points,

        row.id,
      );
  }
}

interface StandingRow {
  id: number;
  stageId: number;
  teamId: number;

  played: number;

  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;

  points: number;
}