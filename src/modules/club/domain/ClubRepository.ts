export interface ClubCreationData {
  name: string;
  shortName?: string;
  nationId?: number;
  cityId?: number;
  stadiumName?: string;
}

export interface CreatedClub {
  team: Record<string, unknown>;
  club: Record<string, unknown>;
  stadium: Record<string, unknown> | null;
}

export interface ClubRepository {
  transaction<T>(work: () => T): T;
  create(data: ClubCreationData): CreatedClub;
}
