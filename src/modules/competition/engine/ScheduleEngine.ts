import type {
  CompetitionParticipant,
} from "../domain/Participant.ts";

import type { Fixture } from "../domain/Fixture.ts";

export interface GeneratedRound {
  roundNumber: number;
  fixtures: Fixture[];
}

export class ScheduleEngine {
  generateDoubleRoundRobin(participants: CompetitionParticipant[]): GeneratedRound[] {
    if (participants.length < 2) {
      throw new Error("Uma competição precisa de pelo menos 2 participantes.",);
    }

    if (participants.length % 2 !== 0) {
      throw new Error("Double round-robin exige número par de participantes.",);
    }

    const teams = [...participants];

    const rounds = teams.length - 1;

    const matchesPerRound = teams.length / 2;

    const schedule: GeneratedRound[] = [];

    for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
      const fixtures: Fixture[] = [];

      for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex++) {
        const home = teams[matchIndex];
        const away = teams[teams.length - 1 - matchIndex];
        const swap = roundIndex % 2 === 1;

        fixtures.push({
          roundId: 0,

          homeTeamId: swap
            ? away.teamId
            : home.teamId,

          awayTeamId: swap
            ? home.teamId
            : away.teamId,

          scheduledAt: "",
          status: "SCHEDULED",
        });
      }

      schedule.push({
        roundNumber: roundIndex + 1,
        fixtures,
      });

      const fixed = teams[0];

      const rotating = teams.slice(1);

      rotating.unshift(
        rotating.pop()!,
      );

      teams.splice(
        0,
        teams.length,
        fixed,
        ...rotating,
      );
    }

    const secondHalf = schedule.map(
      (round, index) => ({
        roundNumber: rounds + index + 1,

        fixtures: round.fixtures.map(
          (fixture) => ({
            ...fixture,

            homeTeamId: fixture.awayTeamId,
            awayTeamId: fixture.homeTeamId,

            roundId: 0,

            scheduledAt: "",
            status: "SCHEDULED" as const,
          }),
        ),
      }),
    );

    return [
      ...schedule,
      ...secondHalf,
    ];
  }
}