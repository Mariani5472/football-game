import type { CreatedPlayer, PlayerCreationData, PlayerRepository } from "../domain/PlayerRepository.js";

export class CreatePlayer {
  constructor(private readonly players: PlayerRepository) {}

  execute(input: PlayerCreationData): CreatedPlayer {
    const fullName = input.fullName.trim();
    if (!fullName) throw new Error("Full name is required.");
    if (!Number.isInteger(input.personTypeId) || input.personTypeId <= 0) {
      throw new Error("A valid person type is required.");
    }
    if (input.positionRating !== undefined && (!Number.isInteger(input.positionRating) || input.positionRating < 0 || input.positionRating > 20)) {
      throw new Error("Position rating must be an integer between 0 and 20.");
    }
    if (input.positionId !== undefined && (!Number.isInteger(input.positionId) || input.positionId <= 0)) {
      throw new Error("A valid position is required.");
    }
    return this.players.transaction(() => this.players.create({ ...input, fullName }));
  }
}
