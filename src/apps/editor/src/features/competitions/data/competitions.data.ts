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

export const copaDoBrasilStages = [
  {
    id: 101,
    seasonId: 2,
    name: "First Round",
    stageOrder: 1,
    format: "KNOCKOUT" as const,
    participants: Array.from({ length: 80 }, (_, index) => index + 1),
    participantRule: { participantType: "TEAM" as const, minParticipants: 80, maxParticipants: 80 },
    participantSources: [],
    formatRule: { formatType: "KNOCKOUT" as const, participantCount: 80, legs: 1, homeAway: 1, aggregateScore: 1, extraTime: 1, penalties: 1, awayGoalsRule: 0 },
    pointsRule: { winPoints: 0, drawPoints: 0, lossPoints: 0 },
    matchRules: [],
    standingRules: [],
    schedule: { schedulingType: "KNOCKOUT" as const, startDate: "2026-02-18", endDate: "2026-02-25", intervalDays: 7, homeAwayBalanced: true },
    qualification: [{ positionFrom: 1, positionTo: 40, type: "QUALIFY" as const, destinationStageId: 102 }],
    draw: { drawType: "RANDOM" as const, groupCount: 40, teamsPerGroup: 2, seedCount: 0 },
  },
  {
    id: 102,
    seasonId: 2,
    name: "Second Round",
    stageOrder: 2,
    format: "KNOCKOUT" as const,
    participants: [],
    participantRule: { participantType: "TEAM" as const, minParticipants: 40, maxParticipants: 40 },
    participantSources: [{ sourceType: "QUALIFICATION", sourceStageId: 101, positionFrom: 1, positionTo: 40 }],
    formatRule: { formatType: "KNOCKOUT" as const, participantCount: 40, legs: 1, homeAway: 1, aggregateScore: 1, extraTime: 1, penalties: 1, awayGoalsRule: 0 },
    pointsRule: { winPoints: 0, drawPoints: 0, lossPoints: 0 },
    matchRules: [],
    standingRules: [],
    schedule: { schedulingType: "KNOCKOUT" as const, startDate: "2026-03-04", endDate: "2026-03-11", intervalDays: 7, homeAwayBalanced: true },
    qualification: [{ positionFrom: 1, positionTo: 20, type: "QUALIFY" as const, destinationStageId: 103 }],
    draw: { drawType: "CONDITIONAL" as const, groupCount: 20, teamsPerGroup: 2, seedCount: 20 },
  },
] satisfies Array<any>;

export const competitions: Competition[] = [
  {
    id: 2,
    name: "Copa do Brasil",
    shortName: "CDB",
    countryId: 1,
    type: "Knockout Cup",
    level: 1,
    reputation: 86,
    seasons: [{ id: 2, competitionId: 2, year: 2026, startDate: "2026-02-18", endDate: "2026-09-07", status: "SCHEDULED", teams: Array.from({ length: 80 }, (_, index) => index + 1), stages: copaDoBrasilStages }],
  },
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
              definitionId: 1,
              drawType: "RANDOM",
              groupCount: 4,
              teamsPerGroup: 4,
              seedCount: 0,
            },
          },
        ],
      },
    ],
  },
];
