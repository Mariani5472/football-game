export interface CalendarRound {
  roundNumber: number;

  date: string;
}

export class CalendarEngine {
  generate(startDate: string, roundCount: number): CalendarRound[] {
    const start = new Date(`${startDate}T00:00:00`);
    const rounds: CalendarRound[] = [];

    for (let i = 0; i < roundCount; i++) {
      const date = new Date(start);

      date.setDate(start.getDate() + i * 7,);

      rounds.push({
        roundNumber: i + 1,
        date: date.toISOString().slice(0, 10),
      });
    }

    return rounds;
  }
}