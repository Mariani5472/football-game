export type TeamKind = "CLUB" | "NATIONAL_TEAM";

export interface Team {
  id: number;
  name: string;
  shortName?: string;
  nationId?: number;
  genderId?: number;
  reputation?: number;
  extinct: boolean;
}

export interface Club {
  teamId: number;
  cityId?: number;
  baseNationId?: number;
  internationalCompetitionNationId?: number;
  situationId?: number;
  minAge?: number;
  maxAge?: number;
  morale?: number;
}

export interface NationalTeam {
  teamId: number;
  nationId: number;
}

export interface TeamDraft {
  name: string;
  shortName: string;
  nationId?: number;
  genderId?: number;
  reputation?: number;
  extinct: boolean;
}