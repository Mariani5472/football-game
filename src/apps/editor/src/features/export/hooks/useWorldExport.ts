import { useCallback, useEffect, useMemo, useState } from "react";
import { exportApi, validationApi, type ExportIssue, type ExportMetadata } from "../../../shared/api";

export function useWorldExport() {
  const [issues, setIssues] = useState<ExportIssue[]>([]);
  const [metadata, setMetadata] = useState<ExportMetadata | null>(null);
  const [outputPath, setOutputPath] = useState("export/world.db");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const validate = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await validationApi.run();
      setIssues(
        result.issues
          .filter(issue => issue.severity === "ERROR" || issue.severity === "WARNING")
          .map(issue => ({
            severity: issue.severity as "ERROR" | "WARNING",
            ruleKey: issue.ruleKey,
            message: issue.message,
          })),
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const exportDatabase = useCallback(async () => {
    setExporting(true);
    setMessage(null);

    try {
      const result = await exportApi.worldDatabase(outputPath);
      setMetadata(result.metadata);
      setIssues(result.issues);
      setMessage(`World DB exportado para ${result.outputPath}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
      await validate();
    } finally {
      setExporting(false);
    }
  }, [outputPath, validate]);

  useEffect(() => {
    void validate();
  }, [validate]);

  const errors = useMemo(
    () => issues.filter(issue => issue.severity === "ERROR"),
    [issues],
  );

  const warnings = useMemo(
    () => issues.filter(issue => issue.severity === "WARNING"),
    [issues],
  );

  return {
    issues,
    errors,
    warnings,
    metadata,
    outputPath,
    setOutputPath,
    loading,
    exporting,
    message,
    validate,
    exportDatabase,
  };
}
