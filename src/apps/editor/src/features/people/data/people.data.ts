import type { Person } from "../types";

export const people: Person[] = [
  {
    id: 1,
    fullName: "João Silva",
    commonName: "João",
    birthDate: "1998-04-12",
    birthCityId: 1,
    nationalityId: 1,
    languageIds: [1],
  },
  {
    id: 2,
    fullName: "Carlos Mendes",
    commonName: "Carlos",
    birthDate: "2001-09-21",
    birthCityId: 2,
    nationalityId: 1,
    languageIds: [1, 2],
  },
];
