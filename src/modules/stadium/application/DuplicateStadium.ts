import type { StadiumRepository } from "../domain/StadiumRepository.js";

export class DuplicateStadium {
  constructor(private readonly stadiums: StadiumRepository) {}

  execute(stadiumId: number) {
    if (!Number.isInteger(stadiumId) || stadiumId <= 0) throw new Error("A valid stadium is required.");
    return this.stadiums.transaction(() => this.stadiums.duplicate(stadiumId));
  }
}

