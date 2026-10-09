import type { EntityRow, Scalar } from "../../../shared/api/editorApi";

export interface Person extends EntityRow {
  id: number;
  first_name: string | null;
  second_name: string | null;
  common_name: string | null;
  full_name: string;
  person_type_id: number;
  sex: string | null;
  height: number | null;
  birth_date: string | null;
  birth_city_id: number | null;
  agent_person_id: number | null;
  retirement_after_current_club: boolean | number;
}

export interface PersonDraft {
  firstName: string;
  secondName: string;
  commonName: string;
  fullName: string;
  personTypeId: string;
  sex: string;
  height: string;
  birthDate: string;
  birthCityId: string;
  agentPersonId: string;
  retirementAfterCurrentClub: boolean;
}

export interface PersonReferenceData {
  personTypes: EntityRow[];
  cities: EntityRow[];
  nations: EntityRow[];
  people: EntityRow[];
  languages: EntityRow[];
  secondNationalityInfo: EntityRow[];
  employments: EntityRow[];
  teams: EntityRow[];
  relationshipReasons: EntityRow[];
  nationalTeams: EntityRow[];
}

export interface PersonInternationalData extends EntityRow {
  person_id: number;
  caps?: number | null;
  goals?: number | null;
  under_21_caps?: number | null;
  under_21_goals?: number | null;
  debut_date?: string | null;
  debut_opponent_nation_id?: number | null;
  first_goal_date?: string | null;
  first_goal_opponent_nation_id?: number | null;
  current_national_team_id?: number | null;
  youth_national_team_id?: number | null;
}

export interface PersonGeneralAttribute extends EntityRow {
  person_id: number;
  current_reputation?: number | null;
  national_reputation?: number | null;
  world_reputation?: number | null;
}

export interface PersonSecondNationality extends EntityRow {
  id: number;
  person_id: number;
  nation_id: number;
  information_id?: number | null;
}

export interface PersonTendency extends EntityRow {
  id: number;
  person_id: number;
  tendency_key: string;
  enabled: boolean | number;
}

export type PersonScalar = Scalar;
