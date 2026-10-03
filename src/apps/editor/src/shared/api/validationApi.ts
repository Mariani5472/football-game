import { request } from "./client";

export interface ValidationIssue {
  id: string;
  ruleKey: string;
  severity: "ERROR" | "WARNING" | "INFO";
  entityType: string;
  entityId?: string | number;
  message: string;
  details?: string;
}

export interface ValidationProfile {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
}

export const validationApi = {
  profiles: () =>
    request<{ profiles: ValidationProfile[] }>("/validation/profiles"),
  run: (profileId?: number) =>
    request<{ issues: ValidationIssue[] }>(
      `/validation/run${profileId ? `?profile=${profileId}` : ""}`,
      { method: "POST" },
    ),
  setProfileEnabled: (id: number, enabled: boolean) =>
    request<ValidationProfile>(`/validation/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  setRuleEnabled: (ruleKey: string, enabled: boolean) =>
    request<{ ok: boolean }>(
      `/validation/rules/${encodeURIComponent(ruleKey)}`,
      { method: "PATCH", body: JSON.stringify({ enabled }) },
    ),
};
