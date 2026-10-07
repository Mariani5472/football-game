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
    if (participants.length < 2) {
      throw new Error(
        "Uma competição precisa de pelo menos 2 participantes.",
      );
    }

    if (participants.length % 2 !== 0) {
      throw new Error(
        "Double round-robin exige número par de participantes.",
      );
    }

    if (!startDate) {
      throw new Error(
        "A competição precisa de uma data de início.",
      );
    }

    if (intervalDays < 1) {
      throw new Error(
        "O intervalo entre rodadas precisa ser maior que zero.",
      );
    }

    const teams = [...participants];
    const firstLegRounds = teams.length - 1;
    const matchesPerRound = teams.length / 2;
    const firstLeg: GeneratedRound[] = [];

    for (
      let roundIndex = 0;
      roundIndex < firstLegRounds;
      roundIndex++
    ) {
      const fixtures: Fixture[] = [];

      for (
        let matchIndex = 0;
        matchIndex < matchesPerRound;
        matchIndex++
      ) {
        const first = teams[matchIndex];
        const second =
          teams[teams.length - 1 - matchIndex];

        const swap = roundIndex % 2 === 1;

        fixtures.push({
          roundNumber: roundIndex + 1,
          homeTeamId: swap
            ? second.teamId
            : first.teamId,
          awayTeamId: swap
            ? first.teamId
            : second.teamId,
          scheduledAt: "",
          status: "SCHEDULED",
        });
      }

      firstLeg.push({
        roundNumber: roundIndex + 1,
        date: this.addDays(
          startDate,
          roundIndex * intervalDays,
        ),
        fixtures,
      });

      const fixed = teams[0];
      const rotating = teams.slice(1);

      rotating.unshift(rotating.pop()!);

      teams.splice(
        0,
        teams.length,
        fixed,
        ...rotating,
      );
    }

    const secondLeg = firstLeg.map(
      (round, index) => ({
        roundNumber: firstLegRounds + index + 1,
        date: this.addDays(
          startDate,
          (firstLegRounds + index) * intervalDays,
        ),
        fixtures: round.fixtures.map(
          (fixture) => ({
            ...fixture,
            roundNumber:
              firstLegRounds + index + 1,
            homeTeamId: fixture.awayTeamId,
            awayTeamId: fixture.homeTeamId,
            scheduledAt: "",
            status: "SCHEDULED" as const,
          }),
        ),
      }),
    );

    return [...firstLeg, ...secondLeg].map(
      (round) => ({
        ...round,
        fixtures: round.fixtures.map(
          (fixture) => ({
            ...fixture,
            scheduledAt:
              `${round.date}T16:00:00`,
          }),
        ),
      }),
    );
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
    if (legs < 1 || legs > 2) throw new Error("Knockout supports one or two legs.");

    const size = 2 ** Math.ceil(Math.log2(participants.length));
    const padded = [...participants];
    while (padded.length < size) {
      padded.push({ teamId: 0, name: "Bye", reputation: 0 });
    }

    const rounds: GeneratedRound[] = [];
    let current = padded;
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

      current = current.filter(team => team.teamId !== 0).filter((_, index) => index % 2 === 0);
      roundNumber += legs === 2 ? 2 : 1;
      if (current.length <= 1) break;
    }

    return rounds.map(round => ({
      ...round,
      fixtures: round.fixtures.map(fixture => ({
        ...fixture,
        scheduledAt: `${round.date}T16:00:00`,
      })),
    }));
  }

  private addDays(
    date: string,
    days: number,
  ): string {
    const value = new Date(
      `${date}T00:00:00Z`,
    );

    value.setUTCDate(
      value.getUTCDate() + days,
    );

    return value.toISOString().slice(0, 10);
  }
}
