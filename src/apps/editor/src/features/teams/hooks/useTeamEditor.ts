import { useState } from "react";
import type { TeamDraft, TeamKind } from "../types";

interface UseTeamEditorOptions {
  initialKind?: TeamKind;
}

export function useTeamEditor({
  initialKind = "CLUB",
}: UseTeamEditorOptions = {}) {
  const [kind, setKind] = useState<TeamKind>(initialKind);

  const [draft, setDraft] = useState<TeamDraft>({
    name: "",
    shortName: "",
    extinct: false,
  });

  function setValue<K extends keyof TeamDraft>(
    field: K,
    value: TeamDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return {
    kind,
    setKind,
    draft,
    setValue,
  };
}