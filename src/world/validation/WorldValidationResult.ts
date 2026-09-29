import type { ValidationIssue } from "./ValidationIssue.js";

export interface WorldValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  valid: boolean;
}
