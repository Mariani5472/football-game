import type { CompetitionStageSetup, StageConfigurationRepository } from "../domain/StageConfigurationRepository.js";
import { validateCompetitionStageSetup } from "./ValidateCompetitionStageSetup.js";

export class CreateCompetitionStage {
  constructor(private readonly repository: StageConfigurationRepository) {}

  execute(input: CompetitionStageSetup) {
    if (!Number.isInteger(input.seasonId) || input.seasonId <= 0) throw new Error("A valid competition season is required.");
    if (!this.repository.seasonExists(input.seasonId)) throw new Error("Competition season does not exist.");
    const setup = validateCompetitionStageSetup(input);
    if (setup.stageOrder !== this.repository.nextStageOrder(setup.seasonId)) {
      throw new Error("Stage order must be the next available position in this season.");
    }
    return this.repository.transaction(() => this.repository.createStage(setup));
  }
}

