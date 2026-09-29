import { useState } from "react";

import type { Player, PlayerDraft } from "../types";

const emptyDraft: PlayerDraft = {
  positionIds: [],
  potential: "",
  estimatedValue: "",
  leftFoot: "",
  rightFoot: "",
  clubId: "",
  contractId: "",
};

export function usePlayerEditor(player?: Player) {
  const [draft, setDraft] = useState<PlayerDraft>(
    player
      ? {
          positionIds: player.positionIds,
          potential: player.potential?.toString() ?? "",
          estimatedValue: player.estimatedValue?.toString() ?? "",
          leftFoot: player.leftFoot?.toString() ?? "",
          rightFoot: player.rightFoot?.toString() ?? "",
          clubId: player.clubId?.toString() ?? "",
          contractId: player.contractId?.toString() ?? "",
        }
      : emptyDraft,
  );

  function setValue(
    name: Exclude<keyof PlayerDraft, "positionIds">,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function togglePosition(positionId: number) {
    setDraft((current) => ({
      ...current,
      positionIds: current.positionIds.includes(positionId)
        ? current.positionIds.filter((id) => id !== positionId)
        : [...current.positionIds, positionId],
    }));
  }

  return { draft, setValue, togglePosition };
}
