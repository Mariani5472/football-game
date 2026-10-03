import { request } from "./client";
import type { WorldDashboard, WorldBuildStatus, WorldPackageRecord, ImportPreview, ImportSession, ImportConflict, RegisterPackagePayload, UpdatePackagePayload } from "./types";

export const worldApi = {
  get: () => request<WorldDashboard>("/world"),
  build: () => request<WorldBuildStatus>("/world/build"),
  settings: () => request<{ name: string; year: number }>("/world/settings"),
  updateSettings: (payload: { name: string; year: number }) =>
    request<{ name: string; year: number }>("/world/settings", { method: "PATCH", body: JSON.stringify(payload) }),
  packages: () => request<{ packages: WorldPackageRecord[] }>("/world/packages"),
  registerPackage: (payload: RegisterPackagePayload) =>
    request<WorldPackageRecord>("/world/packages", { method: "POST", body: JSON.stringify(payload) }),
  updatePackage: (id: number, payload: UpdatePackagePayload) =>
    request<WorldPackageRecord>(`/world/packages/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  removePackage: (id: number) =>
    request<{ deleted: boolean }>(`/world/packages/${id}`, { method: "DELETE" }),
  uploadPackage: (fileName: string, contentBase64: string) =>
    request<{ sourceFile: string; fileName: string; sizeBytes: number; sha256: string }>(
      "/world/packages/upload", { method: "POST", body: JSON.stringify({ fileName, contentBase64 }) }),
  inspectPackage: (sourceFile: string) =>
    request<ImportPreview>("/world/packages/inspect", { method: "POST", body: JSON.stringify({ sourceFile }) }),
  importPackage: (sessionId: number, resolutions: Record<string, ImportConflict["resolution"]> = {}) =>
    request<ImportPreview>("/world/packages/import", { method: "POST", body: JSON.stringify({ sessionId, resolutions }) }),
  importSession: (id: number) => request<ImportSession>(`/world-import-sessions/${id}`),
  importConflicts: (id: number) =>
    request<{ conflicts: ImportConflict[] }>(`/world-import-sessions/${id}/conflicts`),
  rebuild: () =>
    request<{ status: "COMPLETED"; packages: number; rows: number; sessions: number; message: string }>(
      "/world/rebuild", { method: "POST" }),
};
