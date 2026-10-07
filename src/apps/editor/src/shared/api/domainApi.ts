import { request } from "./client";

export const domainApi = {
  duplicateStadium: (id: number) => request<Record<string, unknown>>("/domain/stadium/" + id + "/duplicate", { method: "POST" }),
  duplicateCompetition: (id: number) => request<Record<string, unknown>>("/domain/competition/" + id + "/duplicate", { method: "POST" }),
  importNationRegions: (nationId: number, rows: Array<{ line: number; name: string; shortName?: string; population?: number }>) => request<{ imported: number; errors: Array<{ line: number; message: string }> }>("/domain/nation-regions-import", { method: "POST", body: JSON.stringify({ nationId, rows }) }),
  resolveCompetitionStageParticipants: (seasonId: number, stageId: number) =>
    request<{ participants: Array<Record<string, unknown>> }>(`/domain/competition-stage/${seasonId}/${stageId}/participants`),
  competitionDraw: (payload: {
    teams: Array<{ teamId: number; nationId?: number; seed?: number }>;
    type: "RANDOM" | "SEEDED" | "CONDITIONAL";
    groupCount: number;
    teamsPerGroup: number;
    restrictions?: Array<Record<string, unknown>>;
  }) => request<{ groups: Array<{ number: number; teamIds: number[] }>; assignments: Record<string, number> }>("/domain/competition-draw", { method: "POST", body: JSON.stringify(payload) }),
  competitionTransitions: (seasonId: number) =>
    request<{ transitions: Array<Record<string, unknown>> }>(`/domain/competition-season/${seasonId}/transitions`),
    createLeague: (payload: { name: string; nationId?: number; competitionTypeId?: number; shortName?: string; year: number; teamIds: number[]; startDate: string; endDate?: string; intervalDays?: number; winPoints?: number; drawPoints?: number; lossPoints?: number }) => request<{ competitionId: number; seasonId: number; stageId: number; fixtureCount: number }>("/domain/league", { method: "POST", body: JSON.stringify(payload) }),
  createCompetitionStage: (payload: unknown) => request<{ id: number; seasonId: number; name: string; stageOrder: number }>("/domain/competition-stage", { method: "POST", body: JSON.stringify(payload) }),
  updateCompetitionStage: (id: number, payload: unknown) => request<{ id: number; seasonId: number; name: string; stageOrder: number }>(`/domain/competition-stage/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  createClub: (payload: { name: string; shortName?: string; nationId?: number; cityId?: number; stadiumName?: string }) => request<unknown>("/domain/club", { method: "POST", body: JSON.stringify(payload) }),
  createPlayer: (payload: { fullName: string; commonName?: string; birthDate?: string; personTypeId: number; positionId?: number; positionRating?: number }) => request<unknown>("/domain/player", { method: "POST", body: JSON.stringify(payload) }),
  transfer: (payload: unknown) => request<unknown>("/domain/transfer", { method: "POST", body: JSON.stringify(payload) }),
  contract: (payload: unknown) => request<unknown>("/domain/contract", { method: "POST", body: JSON.stringify(payload) }),
  finance: (payload: unknown) => request<unknown>("/domain/finance", { method: "POST", body: JSON.stringify(payload) }),
  history: (payload: unknown) => request<unknown>("/domain/history", { method: "POST", body: JSON.stringify(payload) }),
  awardHistory: (payload: unknown) => request<unknown>("/domain/award-history", { method: "POST", body: JSON.stringify(payload) }),
  pressSource: (payload: unknown) => request<unknown>("/domain/press-source", { method: "POST", body: JSON.stringify(payload) }),
  climateProfile: (payload: unknown) => request<unknown>("/domain/climate-profile", { method: "POST", body: JSON.stringify(payload) }),
  award: (payload: unknown) => request<unknown>("/domain/award", { method: "POST", body: JSON.stringify(payload) }),
  playerCareer: (payload: unknown) => request<unknown>("/domain/player-career", { method: "POST", body: JSON.stringify(payload) }),
  staffCareer: (payload: unknown) => request<unknown>("/domain/staff-career", { method: "POST", body: JSON.stringify(payload) }),
  achievement: (payload: unknown) => request<unknown>("/domain/achievement", { method: "POST", body: JSON.stringify(payload) }),
  record: (payload: unknown) => request<unknown>("/domain/record", { method: "POST", body: JSON.stringify(payload) }),
  derby: (payload: unknown) => request<unknown>("/domain/derby", { method: "POST", body: JSON.stringify(payload) }),
  climateRegion: (payload: unknown) => request<unknown>("/domain/climate-region", { method: "POST", body: JSON.stringify(payload) }),
  weatherSeason: (payload: unknown) => request<unknown>("/domain/weather-season", { method: "POST", body: JSON.stringify(payload) }),
  nationalityRule: (payload: unknown) => request<unknown>("/domain/nationality-rule", { method: "POST", body: JSON.stringify(payload) }),
};
