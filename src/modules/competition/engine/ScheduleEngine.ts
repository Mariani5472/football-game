import type { CompetitionParticipant } from "../domain/CompetitionParticipant.js";
import type { Fixture } from "../domain/Fixture.js";

export interface GeneratedRound {
  roundNumber: number;
  date: string;
  fixtures: Fixture[];
}

export class ScheduleEngine {
  generateDoubleRoundRobin(
    participants: CompetitionParticipant[],
    startDate: string,
    intervalDays: number,
  ): GeneratedRound[] {
    return this.generateRoundRobin(participants, startDate, intervalDays, 2);
  }

  generateRoundRobin(
    participants: CompetitionParticipant[],
    startDate: string,
    intervalDays: number,
    legs = 1,
  ): GeneratedRound[] {
    this.validateScheduleInput(participants, startDate, intervalDays);

    if (!Number.isInteger(legs) || legs < 1 || legs > 2) {
      throw new Error("Round-robin supports one or two legs.");
    }

    const teams = [...participants];
    const firstLegRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    const firstLeg: GeneratedRound[] = [];

    for (let roundIndex = 0; roundIndex < firstLegRounds; roundIndex += 1) {
      const fixtures: Fixture[] = [];

      for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex += 1) {
        const first = teams[matchIndex];
        const second = teams[teams.length - 1 - matchIndex];
        const swap = roundIndex % 2 === 1;

        fixtures.push({
          roundNumber: roundIndex + 1,
          homeTeamId: swap ? second.teamId : first.teamId,
          awayTeamId: swap ? first.teamId : second.teamId,
          scheduledAt: "",
          status: "SCHEDULED",
        });
      }

      firstLeg.push({
        roundNumber: roundIndex + 1,
        date: this.addDays(startDate, roundIndex * intervalDays),
        fixtures,
      });

      const fixed = teams[0];
      const rotating = teams.slice(1);
      rotating.unshift(rotating.pop()!);
      teams.splice(0, teams.length, fixed, ...rotating);
    }

    const rounds = legs === 1
      ? firstLeg
      : [
          ...firstLeg,
          ...firstLeg.map((round, index) => ({
            roundNumber: firstLegRounds + index + 1,
            date: this.addDays(
              startDate,
              (firstLegRounds + index) * intervalDays,
            ),
            fixtures: round.fixtures.map((fixture) => ({
              ...fixture,
              roundNumber: firstLegRounds + index + 1,
              homeTeamId: fixture.awayTeamId,
              awayTeamId: fixture.homeTeamId,
            })),
          })),
        ];

    return this.scheduleRounds(rounds);
  }

  generateGrouped(
    groups: CompetitionParticipant[][],
    startDate: string,
    intervalDays: number,
    legs = 1,
  ): GeneratedRound[] {
    if (groups.length === 0) throw new Error("Group stage requires at least one group.");
    const generated = groups.map((group) =>
      this.generateRoundRobin(group, startDate, intervalDays, legs),
    );

    const maxRounds = Math.max(...generated.map((rounds) => rounds.length));
    const rounds: GeneratedRound[] = [];

    for (let index = 0; index < maxRounds; index += 1) {
      rounds.push({
        roundNumber: index + 1,
        date: this.addDays(startDate, index * intervalDays),
        fixtures: generated.flatMap((group) => group[index]?.fixtures ?? [])
          .map((fixture) => ({ ...fixture, roundNumber: index + 1 })),
      });
    }

    return this.scheduleRounds(rounds);
  }

  generateKnockout(
    participants: CompetitionParticipant[],
    startDate: string,
    intervalDays: number,
    legs = 1,
  ): GeneratedRound[] {
    if (participants.length < 2) throw new Error("Knockout requires at least two participants.");
    if (!startDate) throw new Error("Knockout requires a start date.");
    if (intervalDays < 1) throw new Error("Knockout interval must be positive.");
    if (!Number.isInteger(legs) || legs < 1 || legs > 2) throw new Error("Knockout supports one or two legs.");

    const seeded = [...participants];
    const size = 2 ** Math.ceil(Math.log2(seeded.length));
    while (seeded.length < size) {
      seeded.push({ teamId: 0, name: "BYE", reputation: 0 });
    }

    const rounds: GeneratedRound[] = [];
    let current = seeded;
    let roundNumber = 1;

    while (current.length > 1) {
      const fixtures: Fixture[] = [];

      for (let index = 0; index < current.length; index += 2) {
        const home = current[index];
        const away = current[index + 1];

        if (home.teamId === 0 || away.teamId === 0) continue;

        fixtures.push({
          roundNumber,
          homeTeamId: home.teamId,
          awayTeamId: away.teamId,
          scheduledAt: "",
          status: "SCHEDULED",
        });

        if (legs === 2) {
          fixtures.push({
            roundNumber: roundNumber + 1,
            homeTeamId: away.teamId,
            awayTeamId: home.teamId,
            scheduledAt: "",
            status: "SCHEDULED",
          });
        }
      }

      rounds.push({
        roundNumber,
        date: this.addDays(startDate, (roundNumber - 1) * intervalDays),
        fixtures,
      });

      current = this.nextKnockoutParticipants(current);
      roundNumber += legs === 2 ? 2 : 1;
    }

    return this.scheduleRounds(rounds);
  }

  private nextKnockoutParticipants(current: CompetitionParticipant[]): CompetitionParticipant[] {
    const realTeams = current.filter((team) => team.teamId !== 0);
    const next: CompetitionParticipant[] = [];

    for (let index = 0; index < realTeams.length; index += 2) {
      const first = realTeams[index];
      const second = realTeams[index + 1];

      if (!second) {
        next.push(first);
        continue;
      }

      next.push({
        teamId: 0,
        name: "TBD",
        reputation: Math.max(first.reputation, second.reputation),
      });
    }

    return next;
  }

  private scheduleRounds(rounds: GeneratedRound[]): GeneratedRound[] {
    return rounds.map((round) => ({
      ...round,
      fixtures: round.fixtures.map((fixture) => ({
        ...fixture,
        scheduledAt: `${round.date}T16:00:00`,
      })),
    }));
  }

  private validateScheduleInput(
    participants: CompetitionParticipant[],
    startDate: string,
    intervalDays: number,
  ): void {
    if (participants.length < 2) {
      throw new Error("A competition needs at least two participants.");
    }

    if (participants.length % 2 !== 0) {
      throw new Error("Round-robin requires an even number of participants.");
    }

    if (!startDate) {
      throw new Error("The competition needs a start date.");
    }

    if (intervalDays < 1) {
      throw new Error("The interval between rounds must be greater than zero.");
    }
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }
}
