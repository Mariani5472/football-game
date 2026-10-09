import { useState } from "react";
import { conditionalDraw, randomDraw } from "./index";
import type {
  DrawRestriction,
  DrawTeam,
  DrawType,
} from "./types";

export interface DrawEditorState {
  drawType: DrawType;
  groupCount: number;
  teamsPerGroup: number;
  seedCount: number;
}

const DEFAULT_DRAW: DrawEditorState = {
  drawType: "RANDOM",
  groupCount: 4,
  teamsPerGroup: 4,
  seedCount: 0,
};

export function useDrawEditor(
  initial: Partial<DrawEditorState> = {},
): {
  state: DrawEditorState;
  update: (patch: Partial<DrawEditorState>) => void;
  draw: (
    teams: DrawTeam[],
    restrictions?: DrawRestriction[],
  ) => ReturnType<typeof randomDraw> | undefined;
} {
  const [state, setState] = useState<DrawEditorState>({
    ...DEFAULT_DRAW,
    ...initial,
  });

  const update = (patch: Partial<DrawEditorState>) => {
    setState((current) => ({ ...current, ...patch }));
  };

  const draw = (
    teams: DrawTeam[],
    restrictions: DrawRestriction[] = [],
  ) => {
    if (state.drawType === "RANDOM") {
      return randomDraw(teams, state.groupCount, state.teamsPerGroup);
    }

    return conditionalDraw(teams, {
      groupCount: state.groupCount,
      teamsPerGroup: state.teamsPerGroup,
      restrictions,
    });
  };

  return { state, update, draw };
}

export function validateDrawConfiguration(input: { teamCount: number; groupCount: number; teamsPerGroup: number }): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.groupCount) || input.groupCount < 1) errors.push("Group count must be a positive integer.");
  if (!Number.isInteger(input.teamsPerGroup) || input.teamsPerGroup < 1) errors.push("Teams per group must be a positive integer.");
  if (input.groupCount * input.teamsPerGroup !== input.teamCount) errors.push("Group count × teams per group must equal the number of participants.");
  return errors;
}
