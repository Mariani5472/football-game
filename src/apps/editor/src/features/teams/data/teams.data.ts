import type { Club, NationalTeam, Team } from "../types";

export const teams: Team[] = [
  {
    id: 1,
    name: "Corinthians",
    shortName: "COR",
    nationId: 1,
    genderId: 1,
    reputation: 80,
    extinct: false,
  },
  {
    id: 2,
    name: "Brazil",
    shortName: "BRA",
    nationId: 1,
    genderId: 1,
    reputation: 95,
    extinct: false,
  },
];

export const clubs: Club[] = [
  {
    teamId: 1,
    cityId: 1,
    baseNationId: 1,
    minAge: 16,
    maxAge: 38,
    morale: 75,
  },
];

export const nationalTeams: NationalTeam[] = [
  {
    teamId: 2,
    nationId: 1,
  },
];