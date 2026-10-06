import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";

export function useClubEditor(clubId: number) {
  const [team, setTeam] = useState<EntityRow | null>(null);
  const [club, setClub] = useState<EntityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true); setError(null);
    try {
      const [teamRow, clubRow] = await Promise.all([
        editorApi.entity.get("team", clubId),
        editorApi.entity.get("club", clubId),
      ]);
      setTeam(teamRow); setClub(clubRow);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, [clubId]);
  return { team, club, loading, error, reload };
}