import type { RoundRobinSchedule, ScheduledFixture, ScheduleGenerationResult } from "./types";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function generateFirstLeg(teamIds: number[]): ScheduledFixture[][] {
  const teams = [...teamIds];
  const rounds: ScheduledFixture[][] = [];
  const roundCount = teams.length - 1;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const fixtures: ScheduledFixture[] = [];

    for (let index = 0; index < teams.length / 2; index += 1) {
      const home = teams[index];
      const away = teams[teams.length - 1 - index];

      fixtures.push({
        roundNumber: roundIndex + 1,
        homeTeamId: home,
        awayTeamId: away,
        scheduledDate: "",
        legNumber: 1,
      });
    }

    rounds.push(fixtures);

    const fixed = teams[0];
    const rotating = teams.slice(1);
    rotating.unshift(rotating.pop() as number);
    teams.splice(0, teams.length, fixed, ...rotating);
  }

  return rounds;
}

export function generateRoundRobin(
  teamIds: number[],
  startDate: string,
  intervalDays: number,
): ScheduleGenerationResult {
  const uniqueTeams = [...new Set(teamIds)];

  if (uniqueTeams.length < 2) {
    return { valid: false, errors: ["Round-robin requires at least two teams."] };
  }

  if (uniqueTeams.length % 2 !== 0) {
    return {
      valid: false,
      errors: ["Round-robin currently requires an even number of teams."],
    };
  }

  if (!startDate) {
    return { valid: false, errors: ["A start date is required."] };
  }

  if (intervalDays < 1) {
    return { valid: false, errors: ["Interval must be at least one day."] };
  }

  const firstLeg = generateFirstLeg(uniqueTeams);
  const rounds: RoundRobinSchedule["rounds"] = [];

  firstLeg.forEach((fixtures, index) => {
    const date = formatDate(
      addDays(new Date(startDate + "T00:00:00Z"), index * intervalDays),
    );

    rounds.push({
      roundNumber: index + 1,
      date,
      fixtures: fixtures.map((fixture) => ({
        ...fixture,
        scheduledDate: date,
      })),
    });
  });

  const secondLeg = [...firstLeg].reverse();

  secondLeg.forEach((fixtures, index) => {
    const roundNumber = firstLeg.length + index + 1;
    const date = formatDate(
      addDays(
        new Date(startDate + "T00:00:00Z"),
        (roundNumber - 1) * intervalDays,
      ),
    );

    rounds.push({
      roundNumber,
      date,
      fixtures: fixtures.map((fixture) => ({
        ...fixture,
        roundNumber,
        homeTeamId: fixture.awayTeamId,
        awayTeamId: fixture.homeTeamId,
        scheduledDate: date,
        legNumber: 2,
      })),
    });
  });

  return {
    valid: true,
    errors: [],
    schedule: {
      rounds,
      totalRounds: rounds.length,
      totalFixtures: rounds.reduce(
        (total, round) => total + round.fixtures.length,
        0,
      ),
    },
  };
}
