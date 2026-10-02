import { useCallback, useEffect, useState } from "react";
import { editorApi, type WorldDashboard } from "../../../shared/api/editorApi";

export function useDashboard() {
  const [data, setData] = useState<WorldDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dashboard = await editorApi.world();
      if (!dashboard.build) {
        dashboard.build = await editorApi.worldBuild();
      }
      setData(dashboard);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, isLoading, refresh };
}
