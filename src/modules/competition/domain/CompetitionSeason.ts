export interface CompetitionSeason {
  id: number;
  externalId: number | null;
  competitionId: number;

  year: number;
  numberOfCompetitors: number;

  startDate: string;
  endDate: string;

  isGroup: boolean;
  hasRounds: boolean;
  hasGroups: boolean;
  hasPlayoff: boolean;

  competitionType: string;
  roundsCount: number;

  promotingTeamsCount: number;
  relegatingTeamsCount: number;
}