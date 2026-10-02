import type { MatchResult } from "../domain/Standing.js";

export interface TeamStrength {
  teamId: number;
  reputation: number;
}

export class MatchEngine {
  simulate(
    home: TeamStrength,
    away: TeamStrength,
    seed: number,
  ): MatchResult {
    const homeRandom = this.random(
      seed + home.teamId * 31 + away.teamId * 17,
    );
    const awayRandom = this.random(
      seed + away.teamId * 29 + home.teamId * 13,
    );

    const homeBase =
      0.65 + Math.max(0, home.reputation) / 100;
    const awayBase =
      0.45 + Math.max(0, away.reputation) / 120;

    const homeGoals = Math.min(
      5,
      Math.floor(homeRandom * (homeBase + 2)),
    );

    const awayGoals = Math.min(
      5,
      Math.floor(awayRandom * (awayBase + 2)),
    );

    return {
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeGoals,
      awayGoals,
    };
  }

  private random(seed: number): number {
    let value =
      Math.imul(
        Math.trunc(seed) || 1,
        1_664_525,
      ) + 1_013_904_223;

    value |= 0;

    value ^= value >>> 16;
    value = Math.imul(value, 2_246_822_519);

    return (
      (value >>> 0) / 4_294_967_296
    );
  }
}
