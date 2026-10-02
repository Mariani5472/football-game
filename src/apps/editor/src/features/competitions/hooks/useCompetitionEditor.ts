import { useState } from "react";
import type {
  Competition,
  CompetitionSeason,
  CompetitionStage,
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

  function updateStageParticipantRule(
    id: number,
    patch: Partial<CompetitionStage["participantRule"]>,
  ) {
    setDraft((current) => updateStageNested(current, id, "participantRule", patch));
  }

  function updateStageFormatRule(
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) {
    setDraft((current) => updateStageNested(current, id, "formatRule", patch));
  }

  function updateStagePointsRule(
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) {
    setDraft((current) => updateStageNested(current, id, "pointsRule", patch));
  }

  function updateStageStandingRules(
    id: number,
    standingRules: CompetitionStage["standingRules"],
  ) {
    updateStage(id, {
      standingRules: standingRules.map((rule, index) => ({
        ...rule,
        ruleOrder: index + 1,
      })),
    });
  }

  return {
    draft,
    setCompetitionValue,
    updateSeason,
    updateStage,
    updateStageParticipantRule,
    updateStageFormatRule,
    updateStagePointsRule,
    updateStageStandingRules,
  };
}

function updateStageNested<
  K extends "participantRule" | "formatRule" | "pointsRule",
>(
  competition: Competition,
  stageId: number,
  key: K,
  patch: Partial<CompetitionStage[K]>,
): Competition {
  return {
    ...competition,
    seasons: competition.seasons.map((season) => ({
      ...season,
      stages: season.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              [key]: {
                ...stage[key],
                ...patch,
              },
            }
          : stage,
      ),
    })),
  };
}
