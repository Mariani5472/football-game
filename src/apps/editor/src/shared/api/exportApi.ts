import { request } from "./client";

export interface ExportMetadata {
  format: string;
  packageVersion: string;
  schemaVersion: number;
  databaseType: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  exportedAt: string;
  tableCount: number;
  rowCount: number;
}

export interface ExportIssue {
  severity: "ERROR" | "WARNING";
  ruleKey: string;
  message: string;
}

export interface ExportResult {
  metadata: ExportMetadata;
  outputPath: string;
  blocked: boolean;
  issues: ExportIssue[];
}

export const exportApi = {
  worldDatabase: (outputPath: string) =>
    request<ExportResult>("/export/world-db", {
      method: "POST",
      body: JSON.stringify({ outputPath }),
    }),
};
