import { ParticipantSourceType, type CompetitionStage, type Participant, type Team } from "../../data/types.js";

export class ParticipantEngine {
  async resolve(stage: CompetitionStage, seasonTeams: Team[]): Promise<Participant[]> {
    if (stage.participantRule.source !== ParticipantSourceType.ALL_TEAMS) throw new Error(`Unsupported participant source: ${stage.participantRule.source}`);
    return seasonTeams.map((team) => ({ stageId: stage.id, teamId: team.id }));
  }
}
