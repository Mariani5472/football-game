import type { SaveDatabase } from "../../database/save/SaveDatabase.js";

export type ClubMentality = "ATTACKING" | "BALANCED" | "COUNTER" | "DEFENSIVE";

export interface ClubMatchPlan {
  teamId: number;
  mentality: ClubMentality;
  effectiveReputation: number;
}

/** Deterministic, data-driven match preparation for clubs without a user-set tactic. */
export class ClubAIService {
  constructor(private readonly save: SaveDatabase) {}

  prepareMatch(
    saveId: number,
    teamId: number,
    opponentReputation: number,
    isManagedClub: boolean,
    matchDate: string,
  ): ClubMatchPlan {
    const state = this.save.connection.prepare(
      "SELECT COALESCE(reputation, 50) AS reputation, COALESCE(morale, 50) AS morale FROM team_state WHERE save_id = ? AND team_id = ? LIMIT 1",
    ).get(saveId, teamId) as { reputation: number; morale: number } | undefined;
    const reputation = state?.reputation ?? 50;
    const morale = state?.morale ?? 50;
    const tactic = this.save.connection.prepare(
      "SELECT mentality, tempo, pressing FROM team_tactic_state WHERE save_id = ? AND team_id = ? ORDER BY id DESC LIMIT 1",
    ).get(saveId, teamId) as { mentality: string | null; tempo: string | null; pressing: string | null } | undefined;

    let mentality: ClubMentality;
    if (isManagedClub && tactic?.mentality) {
      mentality = this.normalizeMentality(tactic.mentality);
    } else if (morale < 35) {
      mentality = "DEFENSIVE";
    } else if (reputation >= opponentReputation + 12) {
      mentality = "ATTACKING";
    } else if (reputation + 8 < opponentReputation) {
      mentality = "COUNTER";
    } else {
      mentality = "BALANCED";
    }

    const mentalityModifier: Record<ClubMentality, number> = {
      ATTACKING: 7,
      BALANCED: 2,
      COUNTER: reputation < opponentReputation ? 5 : 1,
      DEFENSIVE: -2,
    };
    const tempoModifier = /high|fast|quick/i.test(tactic?.tempo ?? "") ? 2 : 0;
    const pressingModifier = /high|intense|aggressive/i.test(tactic?.pressing ?? "") ? 2 : 0;
    const moraleModifier = Math.trunc((morale - 50) / 10);
    const unavailable = this.save.connection.prepare(
      `SELECT COUNT(*) AS count
         FROM team_squad_state squad
         JOIN national_team_selection callup
           ON callup.save_id = squad.save_id AND callup.player_id = squad.player_id
        WHERE squad.save_id = ? AND squad.team_id = ?
          AND callup.call_up_date <= ?
          AND (callup.release_date IS NULL OR callup.release_date >= ?)
          AND callup.status IN ('CALLED', 'ACTIVE')`,
    ).get(saveId, teamId, matchDate, matchDate) as { count: number };
    const internationalAbsencePenalty = Math.min(12, Number(unavailable.count) * 2);
    return {
      teamId,
      mentality,
      effectiveReputation: Math.max(1, Math.min(100, reputation + mentalityModifier[mentality] + tempoModifier + pressingModifier + moraleModifier - internationalAbsencePenalty)),
    };
  }

  private normalizeMentality(value: string): ClubMentality {
    const normalized = value.toUpperCase().replace(/[ -]/g, "_");
    if (normalized.includes("ATTACK")) return "ATTACKING";
    if (normalized.includes("COUNTER")) return "COUNTER";
    if (normalized.includes("DEFENS")) return "DEFENSIVE";
    return "BALANCED";
  }
}
