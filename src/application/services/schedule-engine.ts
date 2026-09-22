import { FixtureStatus, type CompetitionRound, type CompetitionStage, type Fixture, type Participant } from "../../data/types.js";

export class ScheduleEngine {
  generateLeague(stage: CompetitionStage, participants: Participant[]): { rounds: CompetitionRound[]; fixtures: Fixture[] } {
    if (!stage.leagueFormat) throw new Error(`League stage ${stage.id} has no league format`);
    if (participants.length < 2 || participants.length % 2 !== 0) throw new Error("Round-robin requires an even number of at least two participants");
    const teams = participants.map((participant) => participant.teamId); const firstLeg: [string, string][][] = []; let rotation = [...teams];
    for (let week = 0; week < teams.length - 1; week++) { const games: [string, string][] = []; for (let index = 0; index < teams.length / 2; index++) { const left = rotation[index]; const right = rotation[rotation.length - 1 - index]; games.push(week % 2 === 0 ? [left, right] : [right, left]); } firstLeg.push(games); rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)]; }
    const allRounds = stage.leagueFormat.legs === 2 ? [...firstLeg, ...firstLeg.map((games) => games.map(([home, away]) => [away, home] as [string, string]))] : firstLeg;
    const rounds = allRounds.map((_, index) => ({ id: `${stage.id}:round:${index + 1}`, stageId: stage.id, number: index + 1 }));
    const fixtures = allRounds.flatMap((games, roundIndex) => games.map(([homeTeamId, awayTeamId], gameIndex) => ({ id: `${stage.id}:fixture:${roundIndex + 1}:${gameIndex + 1}`, stageId: stage.id, roundId: rounds[roundIndex].id, homeTeamId, awayTeamId, status: FixtureStatus.SCHEDULED, legs: [{ number: 1, homeTeamId, awayTeamId }] })));
    return { rounds, fixtures };
  }
}
