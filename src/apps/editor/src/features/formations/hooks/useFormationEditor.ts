import { useEffect, useState } from "react";
import { editorApi } from "../../../shared/api/editorApi";
import { useFormationReferences } from "./useFormationReferences";
import type {
  Formation,
  FormationInstruction,
  FormationPosition,
  Role,
  RoleKeyAttribute,
  TacticalInstruction,
} from "../types";

interface ReferenceEntity {
  id: number;
  name: string;
}

function toId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: unknown, fallback: string): string {
  return value == null ? fallback : String(value);
}

export function useFormationEditor(
  formation?: Formation,
  onSaved?: () => void,
) {
  const [draft, setDraft] = useState<Formation>(
    formation ?? {
      id: 0,
      name: "",
      description: "",
      positions: [],
      instructions: [],
    },
  );
  const references = useFormationReferences();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFormationData() {
      if (!formation?.id) return;

      setLoading(true);
      setError(null);

      try {
        const [formationPositionResult, assignmentResult, instructionValues] =
          await Promise.all([
            editorApi.entity.list("formation_position", { page: 1, pageSize: 1000 }),
            editorApi.entity.list("formation_position_assignment", { page: 1, pageSize: 1000 }),
            editorApi.entity.list("formation_instruction", { page: 1, pageSize: 1000 }),
          ]);

        if (!active) return;

        const assignments = new Map<number, { roleId: number; dutyId: number }>();
        for (const row of assignmentResult.rows) {
          const formationPositionId = toId(row.formation_position_id);
          const roleId = toId(row.role_id);
          const dutyId = toId(row.duty_id);
          if (formationPositionId == null || roleId == null || dutyId == null) continue;
          assignments.set(formationPositionId, { roleId, dutyId });
        }

        const loadedPositions = formationPositionResult.rows
          .filter(row => toId(row.formation_id) === formation.id)
          .map(row => {
            const id = toId(row.id);
            const positionId = toId(row.position_id);
            if (id == null || positionId == null) return null;
            const assignment = assignments.get(id);

            return {
              id,
              positionId,
              label: references.positionNames.get(positionId) ?? "P" + id,
              side: toText(row.side, "center") as FormationPosition["side"],
              x: toNumber(row.x, 50),
              y: toNumber(row.y, 50),
              roleId: assignment?.roleId ?? 0,
              dutyId: assignment?.dutyId ?? 0,
            } satisfies FormationPosition;
          })
          .filter((position): position is FormationPosition => position !== null);

        const loadedInstructions = instructionValues.rows
          .filter(row => toId(row.formation_id) === formation.id)
          .map(row => {
            const instructionId = toId(row.instruction_id);
            if (instructionId == null) return null;
            return { instructionId, value: toText(row.value, "") } satisfies FormationInstruction;
          })
          .filter((item): item is FormationInstruction => item !== null);

        setDraft(current => ({
          ...current,
          positions: loadedPositions,
          instructions: loadedInstructions,
        }));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFormationData();
    return () => { active = false; };
  }, [formation?.id, references.positionNames]);

  function setValue<K extends keyof Formation>(key: K, value: Formation[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function updatePosition(id: number, patch: Partial<FormationPosition>) {
    setDraft(current => ({
      ...current,
      positions: current.positions.map(position =>
        position.id === id ? { ...position, ...patch } : position,
      ),
    }));
  }

  function addPosition(positionId: number) {
    const reference = references.positions.find(position => position.id === positionId);
    if (!reference) return;

    const index = draft.positions.length;
    const x = index % 2 === 0 ? 45 : 55;
    const y = Math.min(90, 8 + index * 8);

    setDraft(current => ({
      ...current,
      positions: [
        ...current.positions,
        {
          id: -(index + 1),
          positionId,
          label: reference.name,
          side: x < 33 ? "left" : x > 66 ? "right" : "center",
          x,
          y,
          roleId: 0,
          dutyId: 0,
        },
      ],
    }));
  }

  function removePosition(id: number) {
    setDraft(current => ({
      ...current,
      positions: current.positions.filter(position => position.id !== id),
    }));
  }

  function getAvailableRoles(positionId: number) {
    return references.roles.filter(role => role.positionId === positionId);
  }

  function getAvailableDuties(roleId: number) {
    const role = references.roles.find(item => item.id === roleId);
    return role ? references.duties.filter(duty => role.dutyIds.includes(duty.id)) : [];
  }

  function setRole(positionId: number, roleId: number) {
    const current = draft.positions.find(position => position.id === positionId);
    const role = references.roles.find(item => item.id === roleId);
    if (!current || !role || role.positionId !== current.positionId) return;

    updatePosition(positionId, {
      roleId,
      dutyId:
        current.dutyId && role.dutyIds.includes(current.dutyId)
          ? current.dutyId
          : role.dutyIds[0] ?? 0,
    });
  }

  function setDuty(positionId: number, dutyId: number) {
    const position = draft.positions.find(item => item.id === positionId);
    const role = references.roles.find(item => item.id === position?.roleId);
    if (!role?.dutyIds.includes(dutyId)) return;
    updatePosition(positionId, { dutyId });
  }

  function setInstruction(instructionId: number, value: string) {
    setDraft(current => {
      if (!value) {
        return {
          ...current,
          instructions: current.instructions.filter(
            instruction => instruction.instructionId !== instructionId,
          ),
        };
      }

      const exists = current.instructions.some(
        instruction => instruction.instructionId === instructionId,
      );

      return {
        ...current,
        instructions: exists
          ? current.instructions.map(instruction =>
              instruction.instructionId === instructionId
                ? { ...instruction, value }
                : instruction,
            )
          : [...current.instructions, { instructionId, value }],
      };
    });
  }

  async function save() {
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
      };

      if (!payload.name) throw new Error("Formation name is required.");

      let formationId = draft.id;
      if (formationId) {
        await editorApi.entity.update("formation", formationId, payload);
      } else {
        const created = await editorApi.entity.create<{ id: number }>("formation", payload);
        formationId = Number(created.id);
      }

      const existingPositions = await editorApi.entity.list("formation_position", {
        page: 1,
        pageSize: 1000,
      });
      const existingForFormation = existingPositions.rows.filter(
        row => toId(row.formation_id) === formationId,
      );
      const currentIds = new Set(
        draft.positions.filter(position => position.id > 0).map(position => position.id),
      );

      for (const row of existingForFormation) {
        const id = toId(row.id);
        if (id != null && !currentIds.has(id)) await editorApi.entity.remove("formation_position", id);
      }

      const persistedPositionIds = new Map<number, number>();
      for (const position of draft.positions) {
        const positionPayload = {
          formation_id: formationId,
          position_id: position.positionId,
          x: position.x,
          y: position.y,
          side: position.side,
        };

        if (position.id > 0) {
          await editorApi.entity.update("formation_position", position.id, {
            position_id: position.positionId,
            x: position.x,
            y: position.y,
            side: position.side,
          });
          persistedPositionIds.set(position.id, position.id);
        } else {
          const created = await editorApi.entity.create<{ id: number }>(
            "formation_position",
            positionPayload,
          );
          persistedPositionIds.set(position.id, Number(created.id));
        }
      }

      const existingAssignments = await editorApi.entity.list(
        "formation_position_assignment",
        { page: 1, pageSize: 1000 },
      );

      for (const row of existingAssignments.rows) {
        const assignmentId = toId(row.formation_position_id);
        if (
          assignmentId != null &&
          existingForFormation.some(item => toId(item.id) === assignmentId) &&
          !draft.positions.some(
            position =>
              (persistedPositionIds.get(position.id) ?? position.id) === assignmentId,
          )
        ) {
          await editorApi.entity.remove("formation_position_assignment", assignmentId);
        }
      }

      for (const position of draft.positions) {
        const formationPositionId = persistedPositionIds.get(position.id);
        if (formationPositionId == null) continue;

        const role = references.roles.find(item => item.id === position.roleId);
        const validAssignment =
          role?.dutyIds.includes(position.dutyId) ?? false;

        const existingAssignment = existingAssignments.rows.find(
          row => toId(row.formation_position_id) === formationPositionId,
        );

        if (!validAssignment) {
          if (existingAssignment) {
            await editorApi.entity.remove("formation_position_assignment", formationPositionId);
          }
          continue;
        }

        const assignment = {
          role_id: position.roleId,
          duty_id: position.dutyId,
        };

        if (existingAssignment) {
          await editorApi.entity.update(
            "formation_position_assignment",
            formationPositionId,
            assignment,
          );
        } else {
          await editorApi.entity.create("formation_position_assignment", {
            formation_position_id: formationPositionId,
            ...assignment,
          });
        }
      }

      const existingInstructions = await editorApi.entity.list(
        "formation_instruction",
        { page: 1, pageSize: 1000 },
      );
      const currentInstructionIds = new Set(
        draft.instructions.map(instruction => instruction.instructionId),
      );

      for (const row of existingInstructions.rows) {
        const instructionId = toId(row.instruction_id);
        if (
          toId(row.formation_id) === formationId &&
          instructionId != null &&
          !currentInstructionIds.has(instructionId)
        ) {
          await editorApi.entity.remove("formation_instruction", {
            formation_id: formationId,
            instruction_id: instructionId,
          });
        }
      }

      for (const instruction of draft.instructions) {
        const key = {
          formation_id: formationId,
          instruction_id: instruction.instructionId,
        };
        const existing = existingInstructions.rows.find(
          row =>
            toId(row.formation_id) === formationId &&
            toId(row.instruction_id) === instruction.instructionId,
        );

        if (existing) {
          await editorApi.entity.update("formation_instruction", key, {
            value: instruction.value,
          });
        } else {
          await editorApi.entity.create("formation_instruction", {
            ...key,
            value: instruction.value,
          });
        }
      }

      setDraft(current => ({ ...current, id: formationId }));
      onSaved?.();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setSaveError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }

  return {
    draft,
    roles: references.roles,
    duties: references.duties,
    positions: references.positions,
    instructions: references.instructions,
    positionNames: references.positionNames,
    loading: loading || references.loading,
    saving,
    error: error ?? references.error,
    saveError,
    setValue,
    updatePosition,
    addPosition,
    removePosition,
    setRole,
    setDuty,
    setInstruction,
    getAvailableRoles,
    getAvailableDuties,
    save,
  };
}
