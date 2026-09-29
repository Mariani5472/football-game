import { useMemo, useState } from "react";
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

  const allRestrictions = useMemo(
    () => [] as DrawRestriction[],
    [],
  );

  const draw = (
    teams: DrawTeam[],
    restrictions: DrawRestriction[] = allRestrictions,
  ) => {
    if (state.drawType === "RANDOM") {
      return randomDraw(
        teams,
        state.groupCount,
        state.teamsPerGroup,
      );
    }

    if (state.drawType === "CONDITIONAL") {
      return conditionalDraw(teams, {
        groupCount: state.groupCount,
        teamsPerGroup: state.teamsPerGroup,
        restrictions,
      });
    }

    return conditionalDraw(teams, {
      groupCount: state.groupCount,
      teamsPerGroup: state.teamsPerGroup,
      restrictions,
    });
  };

  return { state, update, draw };
}
