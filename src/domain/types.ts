export type Id = string;
export enum StageType { LEAGUE = "LEAGUE", GROUP = "GROUP", KNOCKOUT = "KNOCKOUT", PLAYOFF = "PLAYOFF" }
export enum FixtureStatus { SCHEDULED = "SCHEDULED", LIVE = "LIVE", FINISHED = "FINISHED", POSTPONED = "POSTPONED", CANCELLED = "CANCELLED" }
export enum ParticipantSourceType { ALL_TEAMS = "ALL_TEAMS", TEAM = "TEAM", RANKING_POSITION = "RANKING_POSITION", GROUP_POSITION = "GROUP_POSITION", MATCH_WINNER = "MATCH_WINNER", MATCH_LOSER = "MATCH_LOSER", STAGE_WINNER = "STAGE_WINNER", COMPETITION_WINNER = "COMPETITION_WINNER", DRAW_RESULT = "DRAW_RESULT", PREVIOUS_SEASON = "PREVIOUS_SEASON", PROMOTED = "PROMOTED", RELEGATED = "RELEGATED", EXTERNAL_RANKING = "EXTERNAL_RANKING", TEAM_TITLES = "TEAM_TITLES" }
export enum StandingMetric { POINTS = "POINTS", WINS = "WINS", GOAL_DIFFERENCE = "GOAL_DIFFERENCE", GOALS_FOR = "GOALS_FOR", HEAD_TO_HEAD = "HEAD_TO_HEAD", FAIR_PLAY = "FAIR_PLAY", COEFFICIENT = "COEFFICIENT" }
export type RuleOperation = "FILTER" | "SORT" | "TAKE" | "EXCLUDE" | "UNION" | "INTERSECT" | "SHUFFLE" | "RANK" | "PAIR" | "ASSIGN";
export interface Team { id: Id; name: string; }
export interface Competition { id: Id; name: string; type: string; }
export interface CompetitionSeason { id: Id; competitionId: Id; year: number; numberOfCompetitors?: number; }
export interface ParticipantRule { source: ParticipantSourceType; operations?: { type: RuleOperation; value?: unknown }[]; }
export interface LeagueFormat { legs: 1 | 2; points: { win: number; draw: number; loss: number }; tieBreakers: StandingMetric[]; }
export interface CompetitionStage { id: Id; seasonId: Id; name: string; order: number; type: StageType; participantRule: ParticipantRule; leagueFormat?: LeagueFormat; }
export interface StageGroup { id: Id; stageId: Id; name: string; }
export interface CompetitionRound { id: Id; stageId: Id; number: number; }
export interface Participant { stageId: Id; teamId: Id; groupId?: Id; }
export interface FixtureLeg { number: number; homeTeamId: Id; awayTeamId: Id; result?: MatchResult; }
export interface Fixture { id: Id; stageId: Id; roundId: Id; homeTeamId: Id; awayTeamId: Id; status: FixtureStatus; legs: FixtureLeg[]; }
export interface MatchResult { homeGoals: number; awayGoals: number; }
export interface StandingEntry { stageId: Id; teamId: Id; played: number; points: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; position: number; }
export interface Standing { stageId: Id; entries: StandingEntry[]; }
export interface StageTransition { id: Id; fromStageId: Id; toStageId: Id; source: ParticipantSourceType; }
export interface MatchSimulator { simulate(fixture: Fixture): Promise<MatchResult> | MatchResult; }
