import { useEffect, useState } from "react";
import { editorApi } from "../../../shared/api/editorApi";
import type { Formation, FormationPosition, Role, RoleKeyAttribute } from "../types";

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

export function useFormationEditor(formation?: Formation) {
  const [draft, setDraft] = useState<Formation>(
    formation ?? { id: 0, name: "", description: "", positions: [] },
  );
  const [roles, setRoles] = useState<Role[]>([]);
  const [duties, setDuties] = useState<ReferenceEntity[]>([]);
  const [positions, setPositions] = useState<ReferenceEntity[]>([]);
  const [positionNames, setPositionNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [roleResult, dutyResult, positionResult] = await Promise.all([
          editorApi.list("player_role", {
            page: 1,
            pageSize: 1000,
            orderBy: "name",
            orderDirection: "ASC",
          }),
          editorApi.list("role_duty", {
            page: 1,
            pageSize: 1000,
            orderBy: "name",
            orderDirection: "ASC",
          }),
          editorApi.list("position_definition", {
            page: 1,
            pageSize: 1000,
            orderBy: "name",
            orderDirection: "ASC",
          }),
        ]);

        if (!active) return;

        const nextRoles = roleResult.rows
          .map(row => {
            const id = toId(row.id);
            const positionId = toId(row.position_id);
            if (id == null || positionId == null) return null;

            return {
              id,
              positionId,
              name: toText(row.name, `#${id}`),
              description:
                row.description == null ? undefined : String(row.description),
              dutyIds: [],
              keyAttributes: [] satisfies RoleKeyAttribute[],
            } satisfies Role;
          })
          .filter((role): role is Role => role !== null);

        const nextDuties = dutyResult.rows
          .map(row => {
            const id = toId(row.id);
            return id == null ? null : { id, name: toText(row.name, `#${id}`) };
          })
          .filter((row): row is ReferenceEntity => row !== null);

        const nextPositions = positionResult.rows
          .map(row => {
            const id = toId(row.id);
            return id == null ? null : { id, name: toText(row.name, `#${id}`) };
          })
          .filter((row): row is ReferenceEntity => row !== null);

        setRoles(nextRoles);
        setDuties(nextDuties);
        setPositions(nextPositions);
        setPositionNames(
          new Map(nextPositions.map(position => [position.id, position.name])),
        );

        if (formation?.id) {
          const [formationPositionResult, assignmentResult] = await Promise.all([
            editorApi.list("formation_position", { page: 1, pageSize: 1000 }),
            editorApi.list("formation_position_assignment", {
              page: 1,
              pageSize: 1000,
            }),
          ]);

          if (!active) return;

          const assignments = new Map<number, { roleId: number; dutyId: number }>();

          for (const row of assignmentResult.rows) {
            const formationPositionId = toId(row.formation_position_id);
            const roleId = toId(row.role_id);
            const dutyId = toId(row.duty_id);

            if (
              formationPositionId == null ||
              roleId == null ||
              dutyId == null
            ) {
              continue;
            }

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
                label: toText(row.label, `P${id}`),
                side: toText(row.side, "center") as FormationPosition["side"],
                x: toNumber(row.x, 50),
                y: toNumber(row.y, 50),
                roleId: assignment?.roleId ?? 0,
                dutyId: assignment?.dutyId ?? 0,
              } satisfies FormationPosition;
            })
            .filter(
              (position): position is FormationPosition => position !== null,
            );

          setDraft(current => ({ ...current, positions: loadedPositions }));
        }
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [formation?.id]);

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

  function getAvailableRoles(positionId: number) {
    return roles.filter(role => role.positionId === positionId);
  }

  function getAvailableDuties(roleId: number) {
    const role = roles.find(item => item.id === roleId);
    if (!role) return [];
    return duties;
  }

  function getKeyAttributes(roleId: number) {
    return roles.find(role => role.id === roleId)?.keyAttributes ?? [];
  }

  function setDuty(positionId: number, dutyId: number) {
    updatePosition(positionId, { dutyId });
  }

  function setRole(positionId: number, roleId: number) {
    const current = draft.positions.find(position => position.id === positionId);
    if (!getAvailableRoles(current?.positionId ?? 0).some(role => role.id === roleId)) {
      return;
    }

    updatePosition(positionId, {
      roleId,
      dutyId: current?.dutyId ?? 0,
    });
  }

  async function save() {
    const payload = {
      name: draft.name,
      description: draft.description ?? null,
    };

    if (draft.id) {
      await editorApi.update("formation", draft.id, payload);
    } else {
      const created = await editorApi.create<{ id: number }>("formation", payload);
      setDraft(current => ({ ...current, id: Number(created.id) }));
    }
  }

  return {
    draft,
    roles,
    duties,
    positions,
    positionNames,
    loading,
    error,
    setValue,
    updatePosition,
    setRole,
    getAvailableRoles,
    getAvailableDuties,
    getKeyAttributes,
    setDuty,
    save,
  };
}
