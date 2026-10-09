import type { ClubRepository, ClubCreationData, CreatedClub } from "../domain/ClubRepository.js";

export class CreateClub {
  constructor(private readonly clubs: ClubRepository) {}

  execute(input: ClubCreationData): CreatedClub {
    const name = input.name.trim();
    if (!name) throw new Error("Club name is required.");
    if (input.stadiumName?.trim() && input.cityId === undefined) {
      throw new Error("A city is required when creating a stadium with the club.");
    }
    return this.clubs.transaction(() => this.clubs.create({ ...input, name }));
  }
}
