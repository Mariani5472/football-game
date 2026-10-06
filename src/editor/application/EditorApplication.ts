import type { ContractInput } from "../../modules/career/domain/ContractRepository.js";
import { CreateContract } from "../../modules/career/application/CreateContract.js";
import { SqliteContractRepository } from "../../modules/career/infrastructure/SqliteContractRepository.js";
import type { FinanceInput } from "../../modules/finance/domain/FinanceRepository.js";
import { SaveClubFinance } from "../../modules/finance/application/SaveClubFinance.js";
import { SqliteFinanceRepository } from "../../modules/finance/infrastructure/SqliteFinanceRepository.js";
import type { TransferInput } from "../../modules/transfer/domain/TransferRepository.js";
import { CreateTransfer } from "../../modules/transfer/application/CreateTransfer.js";
import { SqliteTransferRepository } from "../../modules/transfer/infrastructure/SqliteTransferRepository.js";
import type { ClubCreationData } from "../../modules/club/domain/ClubRepository.js";
import { CreateClub } from "../../modules/club/application/CreateClub.js";
import { SqliteClubRepository } from "../../modules/club/infrastructure/SqliteClubRepository.js";
import type { PlayerCreationData } from "../../modules/player/domain/PlayerRepository.js";
import { CreatePlayer } from "../../modules/player/application/CreatePlayer.js";
import { SqlitePlayerRepository } from "../../modules/player/infrastructure/SqlitePlayerRepository.js";
import type { LeagueSetup } from "../../modules/competition/domain/LeagueRepository.js";
import { CreateLeague } from "../../modules/competition/application/CreateLeague.js";
import { SqliteLeagueRepository } from "../../modules/competition/infrastructure/SqliteLeagueRepository.js";
import type { CompetitionStageSetup } from "../../modules/competition/domain/StageConfigurationRepository.js";
import { CreateCompetitionStage } from "../../modules/competition/application/CreateCompetitionStage.js";
import { UpdateCompetitionStage } from "../../modules/competition/application/UpdateCompetitionStage.js";
import { SqliteStageConfigurationRepository } from "../../modules/competition/infrastructure/SqliteStageConfigurationRepository.js";
import type { CompetitionHistoryInput } from "../../modules/competition/domain/CompetitionHistoryRepository.js";
import { RecordCompetitionHistory } from "../../modules/competition/application/RecordCompetitionHistory.js";
import { SqliteCompetitionHistoryRepository } from "../../modules/competition/infrastructure/SqliteCompetitionHistoryRepository.js";
import { DuplicateCompetition } from "../../modules/competition/application/DuplicateCompetition.js";
import { SqliteCompetitionDuplicateRepository } from "../../modules/competition/infrastructure/SqliteCompetitionDuplicateRepository.js";
import { DuplicateStadium } from "../../modules/stadium/application/DuplicateStadium.js";
import { SqliteStadiumRepository } from "../../modules/stadium/infrastructure/SqliteStadiumRepository.js";
import { WorldDatabase } from "../../database/world/WorldDatabase.js";

export class EditorApplication {
  private readonly contracts: CreateContract;
  private readonly finances: SaveClubFinance;
  private readonly transfers: CreateTransfer;
  private readonly clubs: CreateClub;
  private readonly players: CreatePlayer;
  private readonly leagues: CreateLeague;
  private readonly createCompetitionStageUseCase: CreateCompetitionStage;
  private readonly updateCompetitionStageUseCase: UpdateCompetitionStage;
  private readonly competitionHistory: RecordCompetitionHistory;
  private readonly duplicateCompetitionUseCase: DuplicateCompetition;
  private readonly duplicateStadiumUseCase: DuplicateStadium;

  constructor(private readonly database: WorldDatabase) {
    this.contracts = new CreateContract(new SqliteContractRepository(database));
    this.finances = new SaveClubFinance(new SqliteFinanceRepository(database));
    this.transfers = new CreateTransfer(new SqliteTransferRepository(database));
    this.clubs = new CreateClub(new SqliteClubRepository(database));
    this.players = new CreatePlayer(new SqlitePlayerRepository(database));
    this.leagues = new CreateLeague(new SqliteLeagueRepository(database));
    this.createCompetitionStageUseCase = new CreateCompetitionStage(
      new SqliteStageConfigurationRepository(database),
    );
    this.updateCompetitionStageUseCase = new UpdateCompetitionStage(
      new SqliteStageConfigurationRepository(database),
    );
    this.competitionHistory = new RecordCompetitionHistory(
      new SqliteCompetitionHistoryRepository(database),
    );
    this.duplicateCompetitionUseCase = new DuplicateCompetition(
      new SqliteCompetitionDuplicateRepository(database),
    );
    this.duplicateStadiumUseCase = new DuplicateStadium(
      new SqliteStadiumRepository(database),
    );
  }

  createClub(input: ClubCreationData) {
    return this.clubs.execute(input);
  }

  createPlayer(input: PlayerCreationData) {
    return this.players.execute(input);
  }

  createLeague(input: LeagueSetup) {
    return this.leagues.execute(input);
  }

  createCompetitionStage(input: CompetitionStageSetup) {
    return this.createCompetitionStageUseCase.execute(input);
  }

  updateCompetitionStage(stageId: number, input: CompetitionStageSetup) {
    return this.updateCompetitionStageUseCase.execute(stageId, input);
  }

  duplicateCompetition(competitionId: number) {
    return this.duplicateCompetitionUseCase.execute(competitionId);
  }

  duplicateStadium(stadiumId: number) {
    return this.duplicateStadiumUseCase.execute(stadiumId);
  }

  createTransfer(input: TransferInput) {
    return this.transfers.execute(input);
  }

  createContract(input: ContractInput) {
    return this.contracts.execute(input);
  }

  saveClubFinance(input: FinanceInput) {
    return this.finances.execute(input);
  }

  createCompetitionHistory(input: CompetitionHistoryInput) {
    return this.competitionHistory.execute(input);
  }
}
