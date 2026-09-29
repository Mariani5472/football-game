import { useState } from "react";
import type {
  Competition,
  CompetitionSeason,
  CompetitionStage,
  StageRules,
} from "../types";

export function useCompetitionEditor(competition?: Competition) {
  const [draft, setDraft] = useState<Competition>(
    competition ?? {
      id: 0,
      name: "",
      shortName: "",
      type: "League",
      seasons: [],
    },
  );

  function setCompetitionValue<K extends keyof Competition>(
    key: K,
    value: Competition[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSeason(id: number, patch: Partial<CompetitionSeason>) {
    setDraft((current) => ({
      ...current,
      seasons: current.seasons.map((season) =>
        season.id === id ? { ...season, ...patch } : season,
      ),
    }));
  }

  function updateStage(id: number, patch: Partial<CompetitionStage>) {
    setDraft((current) => ({
      ...current,
      seasons: current.seasons.map((season) => ({
        ...season,
        stages: season.stages.map((stage) =>
          stage.id === id ? { ...stage, ...patch } : stage,
        ),
      })),
    }));
  }

  function updateStageRules(id: number, patch: Partial<StageRules>) {
    setDraft((current) => ({
      ...current,
      seasons: current.seasons.map((season) => ({
        ...season,
        stages: season.stages.map((stage) =>
          stage.id === id
            ? { ...stage, rules: { ...stage.rules, ...patch } }
            : stage,
        ),
      })),
    }));
  }

  return {
    draft,
    setCompetitionValue,
    updateSeason,
    updateStage,
    updateStageRules,
  };
}
