import type { ValidationSeverity } from "./ValidationSeverity.js";

export interface ValidationIssue {
  severity: ValidationSeverity;
  rule: string;
  message: string;
  entityType?: string;
  entityId?: number;
}
