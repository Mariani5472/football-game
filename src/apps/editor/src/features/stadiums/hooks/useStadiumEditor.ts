import { useState } from "react";
import type { Stadium } from "../types";

export interface StadiumDraft {
  name: string;
  cityId: string;
  capacity: string;
  seatedCapacity: string;
  pitchTypeId: string;
  ownerClubId: string;
  qualityStateId: string;
  environmentQualityId: string;
  grassDeteriorationRateId: string;
  hasCover: boolean;
  hasRetractableRoof: boolean;
  hasUnderfloorHeating: boolean;
  hasDigitalAdvertising: boolean;
}

function toDraft(stadium?: Stadium): StadiumDraft {
  return {
    name: stadium?.name ?? "",
    cityId: stadium?.cityId?.toString() ?? "",
    capacity: stadium?.capacity?.toString() ?? "",
    seatedCapacity: stadium?.seatedCapacity?.toString() ?? "",
    pitchTypeId: stadium?.pitchTypeId?.toString() ?? "",
    ownerClubId: stadium?.ownerClubId?.toString() ?? "",
    qualityStateId: stadium?.qualityStateId?.toString() ?? "",
    environmentQualityId: stadium?.environmentQualityId?.toString() ?? "",
    grassDeteriorationRateId: stadium?.grassDeteriorationRateId?.toString() ?? "",
    hasCover: stadium?.hasCover ?? false,
    hasRetractableRoof: stadium?.hasRetractableRoof ?? false,
    hasUnderfloorHeating: stadium?.hasUnderfloorHeating ?? false,
    hasDigitalAdvertising: stadium?.hasDigitalAdvertising ?? false,
  };
}

export function useStadiumEditor(stadium?: Stadium) {
  const [draft, setDraft] = useState<StadiumDraft>(() => toDraft(stadium));

  function setValue<K extends keyof StadiumDraft>(
    field: K,
    value: StadiumDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return { draft, setValue };
}