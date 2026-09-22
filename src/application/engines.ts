import { FixtureStatus, ParticipantSourceType, StandingMetric, type CompetitionRound, type CompetitionStage, type Fixture, type MatchResult, type Participant, type StandingEntry, type Team } from "../domain/types.js";

export class ParticipantEngine {
  async resolve(stage: CompetitionStage, seasonTeams: Team[]): Promise<Participant[]> {
    if (stage.participantRule.source !== ParticipantSourceType.ALL_TEAMS) throw new Error(`Unsupported participant source: ${stage.participantRule.source}`);
    return seasonTeams.map((team) => ({ stageId: stage.id, teamId: team.id }));
  }
}

export class ScheduleEngine {
  generateLeague(stage: CompetitionStage, participants: Participant[]): { rounds: CompetitionRound[]; fixtures: Fixture[] } {
    if (!stage.leagueFormat) throw new Error(`League stage ${stage.id} has no league format`);
    if (participants.length < 2 || participants.length % 2 !== 0) throw new Error("Round-robin requires an even number of at least two participants");
    const teams = participants.map((p) => p.teamId);
    const firstLeg: [string, string][][] = [];
    let rotation = [...teams];
    for (let week = 0; week < teams.length - 1; week++) {
      const games: [string, string][] = [];
      for (let i = 0; i < teams.length / 2; i++) {
        const left = rotation[i]; const right = rotation[rotation.length - 1 - i];
        games.push(week % 2 === 0 ? [left, right] : [right, left]);
      }
      firstLeg.push(games);
      rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
    }
    const allRounds = stage.leagueFormat.legs === 2 ? [...firstLeg, ...firstLeg.map((games) => games.map(([h, a]) => [a, h] as [string, string]))] : firstLeg;
    const rounds = allRounds.map((_, index) => ({ id: `${stage.id}:round:${index + 1}`, stageId: stage.id, number: index + 1 }));
    const fixtures = allRounds.flatMap((games, index) => games.map(([homeTeamId, awayTeamId], game) => ({ id: `${stage.id}:fixture:${index + 1}:${game + 1}`, stageId: stage.id, roundId: rounds[index].id, homeTeamId, awayTeamId, status: FixtureStatus.SCHEDULED, legs: [{ number: 1, homeTeamId, awayTeamId }] })));
    return { rounds, fixtures };
  }
}

export class StandingEngine {
  calculate(stage: CompetitionStage, fixtures: Fixture[], teamIds: string[]): StandingEntry[] {
    if (!stage.leagueFormat) throw new Error("Standing calculation requires league format");
    const entries = new Map(teamIds.map((teamId) => [teamId, { stageId: stage.id, teamId, played: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, position: 0 }]));
    for (const fixture of fixtures) {
      const result = fixture.legs[0]?.result;
      if (fixture.status !== FixtureStatus.FINISHED || !result) continue;
      const home = entries.get(fixture.homeTeamId); const away = entries.get(fixture.awayTeamId);
      if (!home || !away) throw new Error("Fixture team is not a stage participant");
      home.played++; away.played++; home.goalsFor += result.homeGoals; home.goalsAgainst += result.awayGoals; away.goalsFor += result.awayGoals; away.goalsAgainst += result.homeGoals;
      if (result.homeGoals > result.awayGoals) { home.wins++; home.points += stage.leagueFormat.points.win; away.losses++; away.points += stage.leagueFormat.points.loss; }
      else if (result.homeGoals < result.awayGoals) { away.wins++; away.points += stage.leagueFormat.points.win; home.losses++; home.points += stage.leagueFormat.points.loss; }
      else { home.draws++; away.draws++; home.points += stage.leagueFormat.points.draw; away.points += stage.leagueFormat.points.draw; }
    }
    const metric = (entry: StandingEntry, rule: StandingMetric) => rule === StandingMetric.POINTS ? entry.points : rule === StandingMetric.WINS ? entry.wins : rule === StandingMetric.GOAL_DIFFERENCE ? entry.goalDifference : rule === StandingMetric.GOALS_FOR ? entry.goalsFor : 0;
    const result = [...entries.values()].map((entry) => ({ ...entry, goalDifference: entry.goalsFor - entry.goalsAgainst }));
    result.sort((a, b) => { for (const rule of stage.leagueFormat!.tieBreakers) { const difference = metric(b, rule) - metric(a, rule); if (difference) return difference; } return a.teamId.localeCompare(b.teamId); });
    return result.map((entry, index) => ({ ...entry, position: index + 1 }));
  }
}

export class SeededMatchSimulator {
  constructor(private seed = 1) {}
  simulate(_fixture: Fixture): MatchResult { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; const homeGoals = this.seed % 5; this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return { homeGoals, awayGoals: this.seed % 4 }; }
}
