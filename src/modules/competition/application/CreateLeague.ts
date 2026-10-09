import { ScheduleEngine } from "../engine/ScheduleEngine.js";
import type { LeagueRepository, LeagueSetup } from "../domain/LeagueRepository.js";

export class CreateLeague {
  private readonly schedule = new ScheduleEngine();
  constructor(private readonly repository: LeagueRepository) {}

  execute(input: LeagueSetup) {
    const name = input.name.trim();
    const teamIds = [...new Set(input.teamIds)];
    if (!name) throw new Error("Competition name is required.");
    if (teamIds.length < 2) throw new Error("A league requires at least two distinct teams.");
    if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 3000) throw new Error("Season year is invalid.");
    if (input.shortName && input.shortName.trim().length > 3) throw new Error("Competition short name must be at most three characters.");
    if (!input.startDate || input.intervalDays < 1) throw new Error("A start date and positive interval are required.");
    if (![input.winPoints, input.drawPoints, input.lossPoints].every(Number.isInteger)) throw new Error("Points must be whole numbers.");
    this.repository.validateReferences(input);

    const participants = this.repository.findTeams(teamIds);
    if (participants.length !== teamIds.length) throw new Error("One or more selected teams do not exist.");
    const scheduled = [...participants];
    if (scheduled.length % 2 !== 0) scheduled.push({ teamId: 0, name: "Bye", reputation: 0 });
    const generated = this.schedule.generateDoubleRoundRobin(scheduled, input.startDate, input.intervalDays)
      .map(round => ({ ...round, fixtures: round.fixtures.filter(fixture => fixture.homeTeamId !== 0 && fixture.awayTeamId !== 0) }));

    return this.repository.transaction(() => this.repository.createLeague({ ...input, name, teamIds }, generated));
  }
}
