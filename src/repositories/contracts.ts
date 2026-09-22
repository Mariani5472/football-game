import type { Competition, CompetitionRound, CompetitionSeason, CompetitionStage, Fixture, Id, Participant, StandingEntry, Team } from "../domain/types.js";
export interface CompetitionRepository { findById(id: Id): Promise<Competition | null>; }
export interface SeasonRepository { findById(id: Id): Promise<CompetitionSeason | null>; }
export interface StageRepository { findById(id: Id): Promise<CompetitionStage | null>; findBySeasonId(seasonId: Id): Promise<CompetitionStage[]>; }
export interface ParticipantRepository { findSeasonTeams(seasonId: Id): Promise<Team[]>; saveForStage(stageId: Id, participants: Participant[]): Promise<void>; findByStageId(stageId: Id): Promise<Participant[]>; }
export interface FixtureRepository { saveRounds(rounds: CompetitionRound[]): Promise<void>; saveFixtures(fixtures: Fixture[]): Promise<void>; findRoundsByStageId(stageId: Id): Promise<CompetitionRound[]>; findFixturesByStageId(stageId: Id): Promise<Fixture[]>; update(fixture: Fixture): Promise<void>; }
export interface StandingRepository { save(entries: StandingEntry[]): Promise<void>; findByStageId(stageId: Id): Promise<StandingEntry[]>; }
