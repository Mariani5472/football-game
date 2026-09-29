import type { Competition } from "./Competition.js";
import type { CompetitionParticipant } from "./CompetitionParticipant.js";
import type { CompetitionSeason } from "./CompetitionSeason.js";
import type { CompetitionStage } from "./CompetitionStage.js";
import type { Fixture } from "./Fixture.js";

export interface GeneratedSeason {
  competition: Competition;
  season: CompetitionSeason;
  stage: CompetitionStage;
  participants: CompetitionParticipant[];
  rounds: number;
  fixtures: Fixture[];
}
