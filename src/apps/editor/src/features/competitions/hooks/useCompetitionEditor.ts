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
    updateStage(id, {
      participantRule: {
        ...findStage(id).participantRule,
        ...patch,
      },
    });
  }

  function updateStageFormatRule(
    id: number,
    patch: Partial<CompetitionStage["formatRule"]>,
  ) {
    updateStage(id, {
      formatRule: {
        ...findStage(id).formatRule,
        ...patch,
      },
    });
  }

  function updateStagePointsRule(
    id: number,
    patch: Partial<CompetitionStage["pointsRule"]>,
  ) {
    updateStage(id, {
      pointsRule: {
        ...findStage(id).pointsRule,
        ...patch,
      },
    });
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

  function findStage(id: number): CompetitionStage {
    for (const season of draft.seasons) {
      const stage = season.stages.find((item) => item.id === id);

      if (stage) {
        return stage;
      }
    }

    throw new Error(`Stage ${id} not found.`);
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
