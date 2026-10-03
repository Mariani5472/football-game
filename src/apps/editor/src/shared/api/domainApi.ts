import { request } from "./client";

export const domainApi = {
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
