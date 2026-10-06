export interface PlayerCreationData {
  fullName: string;
  commonName?: string;
  birthDate?: string;
  personTypeId: number;
  positionId?: number;
  positionRating?: number;
}

export interface CreatedPlayer {
  person: Record<string, unknown>;
  player: Record<string, unknown>;
}

export interface PlayerRepository {
  transaction<T>(work: () => T): T;
  create(data: PlayerCreationData): CreatedPlayer;
}
