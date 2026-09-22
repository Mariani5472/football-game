import type Database from "better-sqlite3";
import { MatchResult } from "./MatchEngine.js";

export class StandingEngine {
  constructor(private readonly db: Database.Database) {}

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
    });

    transaction(teamIds);
  }

  applyResult(stageId: number, result: MatchResult,): void {
    const home = this.getStanding(stageId, result.homeTeamId,);
    const away = this.getStanding(stageId, result.awayTeamId,);

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

  private getStanding(stageId: number, teamId: number,): StandingRow {
    const row = this.db.prepare(`
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
      .get(stageId, teamId,) as StandingRow | undefined;

    if (!row) {
      throw new Error(`Standing não encontrada para team=${teamId}`,);
    }

    return row;
  }

  private update(row: StandingRow): void {
    this.db.prepare(`
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