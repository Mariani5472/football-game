import type { DashboardData } from "../types";

export const dashboardData: DashboardData = {
  world: {
    name: "Brazil",
    year: 2026,
    status: "VALID",
    warnings: 3,
    errors: 0,
  },

  counts: {
    countries: 1,
    cities: 27,
    clubs: 20,
    players: 500,
    stadiums: 20,
    competitions: 5,
  },

  recentEntities: [
    {
      id: "club-corinthians",
      name: "Corinthians",
      type: "Club",
    },
    {
      id: "club-flamengo",
      name: "Flamengo",
      type: "Club",
    },
    {
      id: "club-sao-paulo",
      name: "São Paulo",
      type: "Club",
    },
    {
      id: "competition-brasileirao",
      name: "Brasileirão",
      type: "Competition",
    },
    {
      id: "country-brazil",
      name: "Brazil",
      type: "Country",
    },
  ],
};