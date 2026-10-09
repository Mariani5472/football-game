import type { CompetitionStageSetup, StageConfigurationRepository } from "../domain/StageConfigurationRepository.js";
import { validateCompetitionStageSetup } from "./ValidateCompetitionStageSetup.js";

export class UpdateCompetitionStage {
  constructor(private readonly repository: StageConfigurationRepository) {}

  execute(stageId: number, input: CompetitionStageSetup) {
    if (!Number.isInteger(stageId) || stageId <= 0) throw new Error("A valid stage is required.");
    if (!Number.isInteger(input.seasonId) || input.seasonId <= 0 || !this.repository.seasonExists(input.seasonId)) {
      throw new Error("Competition season does not exist.");
    }
    if (!this.repository.stageBelongsToSeason(stageId, input.seasonId)) {
      throw new Error("Stage does not belong to the selected season.");
    }
    const setup = validateCompetitionStageSetup(input);
    if (!this.repository.stageOrderAvailable(setup.seasonId, setup.stageOrder, stageId)) {
      throw new Error("Stage order is already used in this season.");
    }
    return this.repository.transaction(() => this.repository.updateStage(stageId, setup));
  }
}

