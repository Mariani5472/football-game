import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import type { Formation, FormationPosition, Role } from "../types";

export function useFormationEditor(formation?: Formation) {
  const [draft, setDraft] = useState<Formation>(
    formation ?? { id: 0, name: "", description: "", positions: [] },
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [duties, setDuties] = useState<EntityRow[]>([]);
  const [positions, setPositions] = useState<EntityRow[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      editorApi.list("player_role", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
      editorApi.list("role_duty", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
      editorApi.list("position_definition", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
    ]).then(([roleResult, dutyResult, positionResult]) => {
      if (!active) return;
      setRoles(roleResult.rows.map(row => ({ id: Number(row.id), positionId: Number(row.position_id), name: String(row.name), description: row.description == null ? undefined : String(row.description), dutyIds: [], keyAttributes: [] })));
      setDuties(dutyResult.rows);
      setPositions(positionResult.rows);
    });
    return () => { active = false; };
  }, []);

  function setValue<K extends keyof Formation>(key: K, value: Formation[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function updatePosition(id: number, patch: Partial<FormationPosition>) {
    setDraft(current => ({ ...current, positions: current.positions.map(position => position.id === id ? { ...position, ...patch } : position) }));
  }

  function getAvailableRoles(positionId: number) {
    return roles.filter(role => role.positionId === positionId);
  }

  function getAvailableDuties(roleId: number) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return [];
    const ids = role.dutyIds;
    return duties.filter(duty => ids.length === 0 || ids.includes(Number(duty.id)));
  }

  function setDuty(positionId: number, dutyId: number) {
    updatePosition(positionId, { dutyId });
  }

  function setRole(positionId: number, roleId: number) {
    const current = draft.positions.find(position => position.id === positionId);
    const availableDuties = getAvailableDuties(roleId);
    updatePosition(positionId, {
      roleId,
      dutyId: current && availableDuties.some(duty => Number(duty.id) === current.dutyId)
        ? current.dutyId
        : availableDuties.length ? Number(availableDuties[0].id) : current?.dutyId ?? 0,
    });
  }

  return { draft, roles, duties, positions, setValue, updatePosition, setRole, getAvailableRoles, getAvailableDuties, setDuty };
}
