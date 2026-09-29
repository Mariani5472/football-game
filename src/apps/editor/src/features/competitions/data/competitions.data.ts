import type { Competition } from "../types";
import {
  LEAGUE_TEAM_COUNT,
  leagueFormatRule,
  leagueParticipantRule,
  leaguePointsRule,
  leagueStandingRules,
} from "../rules/league";

export const brasileiraoTeams = Array.from(
  { length: LEAGUE_TEAM_COUNT },
  (_, index) => index + 1,
);

export const competitions: Competition[] = [
  {
    id: 1,
    name: "Brasileirão",
    shortName: "BRA",
    countryId: 1,
    type: "League",
    level: 1,
    reputation: 90,
    seasons: [
      {
        id: 1,
        competitionId: 1,
        year: 2026,
        startDate: "2026-04-04",
        endDate: "2026-12-06",
        status: "SCHEDULED",
        teams: brasileiraoTeams,
        stages: [
          {
            id: 1,
            seasonId: 1,
            name: "League",
            stageOrder: 1,
            format: "LEAGUE",
            participants: brasileiraoTeams,
            participantRule: leagueParticipantRule,
            participantSources: [],
            formatRule: leagueFormatRule,
            pointsRule: leaguePointsRule,
            matchRules: [],
            standingRules: leagueStandingRules,
            schedule: {
              schedulingType: "ROUND_ROBIN",
              startDate: "2026-04-04",
              endDate: "2026-12-06",
              intervalDays: 7,
              homeAwayBalanced: true,
            },
            qualification: [
              {
                positionFrom: 1,
                positionTo: 4,
                type: "QUALIFY",
                destinationCompetitionId: 2,
              },
              {
                positionFrom: 17,
                positionTo: 20,
                type: "RELEGATE",
                destinationCompetitionId: 3,
              },
            ],
            draw: {
              type: "NONE",
              seedCount: 0,
              orderMode: "RANDOM",
            },
          },
        ],
      },
    ],
  },
];
