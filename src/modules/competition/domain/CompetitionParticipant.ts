export type ParticipantSourceType =
  | "DIRECT"
  | "STANDING"
  | "QUALIFICATION"
  | "PROMOTION"
  | "RELEGATION";

export interface ParticipantSource {
  type: ParticipantSourceType;
  sourceCompetitionId?: number;
  sourceSeasonId?: number;
  sourceStageId?: number;
  positionFrom?: number;
  positionTo?: number;
  qualificationType?: "QUALIFY" | "PROMOTE" | "RELEGATE";
}

export interface CompetitionParticipant {
  teamId: number;
  name: string;
  reputation: number;
  nationId?: number;
  source?: ParticipantSource;
}

export interface ResolvedParticipantSource {
  source: ParticipantSource;
  teamIds: number[];
}
