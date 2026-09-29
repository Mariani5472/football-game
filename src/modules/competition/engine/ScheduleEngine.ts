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
