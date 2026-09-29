import { useState } from "react";

import { attributeDefinitions } from "../../attributes";
import { duties, getDuty, getRole, roles } from "../data/formations.data";
import type { Formation, FormationPosition } from "../types";

export function useFormationEditor(formation?: Formation) {
  const [draft, setDraft] = useState<Formation>(
    formation ?? {
      id: 0,
      name: "",
      description: "",
      positions: [],
    },
  );

  function setValue<K extends keyof Formation>(key: K, value: Formation[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updatePosition(id: number, patch: Partial<FormationPosition>) {
    setDraft((current) => ({
      ...current,
      positions: current.positions.map((position) =>
        position.id === id ? { ...position, ...patch } : position,
      ),
    }));
  }

  function getAvailableRoles(positionId: number) {
    return roles.filter((role) => role.positionId === positionId);
  }

  function getAvailableDuties(roleId: number) {
    const role = getRole(roleId);
    return duties.filter((duty) => role?.dutyIds.includes(duty.id));
  }

  function getKeyAttributes(roleId: number) {
    const role = getRole(roleId);

    return (role?.keyAttributes ?? [])
      .map((entry) => ({
        ...entry,
        attribute: attributeDefinitions.find(
          (attribute) => attribute.id === entry.attributeId,
        ),
      }))
      .filter((entry) => entry.attribute);
  }

  function setDuty(positionId: number, dutyId: number) {
    updatePosition(positionId, { dutyId });
  }

  function setRole(positionId: number, roleId: number) {
    const availableDuties = getAvailableDuties(roleId);
    const current = draft.positions.find((position) => position.id === positionId);

    updatePosition(positionId, {
      roleId,
      dutyId: current && availableDuties.some((duty) => duty.id === current.dutyId)
        ? current.dutyId
        : availableDuties[0]?.id ?? 1,
    });
  }

  return {
    draft,
    setValue,
    updatePosition,
    setRole,
    getAvailableRoles,
    getAvailableDuties,
    getKeyAttributes,
    setDuty,
    getRole,
    getDuty,
  };
}
