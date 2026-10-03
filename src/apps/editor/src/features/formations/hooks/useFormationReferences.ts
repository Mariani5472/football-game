import { useEffect, useState } from "react";
import { entityApi } from "../../../shared/api/entityApi";
import type { Role, TacticalInstruction } from "../types";

export interface ReferenceEntity {
  id: number;
  name: string;
}

function toId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

function text(value: unknown, fallback: string) {
  return value == null ? fallback : String(value);
}

export function useFormationReferences() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [duties, setDuties] = useState<ReferenceEntity[]>([]);
  const [positions, setPositions] = useState<ReferenceEntity[]>([]);
  const [instructions, setInstructions] = useState<TacticalInstruction[]>([]);
  const [positionNames, setPositionNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [roleResult, dutyResult, positionResult, roleDutyResult, instructionResult] =
          await Promise.all([
            entityApi.list("player_role", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
            entityApi.list("role_duty", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
            entityApi.list("position_definition", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }),
            entityApi.list("player_role_duty", { page: 1, pageSize: 1000 }),
            entityApi.list("tactical_instruction", { page: 1, pageSize: 1000, orderBy: "category", orderDirection: "ASC" }),
          ]);

        if (!active) return;

        const roleDutyMap = new Map<number, number[]>();
        for (const row of roleDutyResult.rows) {
          const roleId = toId(row.role_id);
          const dutyId = toId(row.duty_id);
          if (roleId == null || dutyId == null) continue;
          roleDutyMap.set(roleId, [...(roleDutyMap.get(roleId) ?? []), dutyId]);
        }

        const nextRoles = roleResult.rows
           .map((row): Role | null => {
            const id = toId(row.id);
            const positionId = toId(row.position_id);
            if (id == null || positionId == null) return null;
            return {
              id,
              positionId,
              name: text(row.name, "#" + id),
              description: row.description == null ? undefined : String(row.description),
              dutyIds: roleDutyMap.get(id) ?? [],
              keyAttributes: [],
            } satisfies Role;
          })
           .filter((role): role is Role => role !== null);

        const nextDuties = dutyResult.rows
          .map(row => {
            const id = toId(row.id);
            return id == null ? null : { id, name: text(row.name, "#" + id) };
          })
          .filter((row): row is ReferenceEntity => row !== null);

        const nextPositions = positionResult.rows
          .map(row => {
            const id = toId(row.id);
            return id == null ? null : { id, name: text(row.name, "#" + id) };
          })
          .filter((row): row is ReferenceEntity => row !== null);

        const nextInstructions = instructionResult.rows
          .map(row => {
            const id = toId(row.id);
            if (id == null) return null;
            return {
              id,
              name: text(row.name, "#" + id),
              category: text(row.category, "General"),
              valueType: text(row.value_type, "TEXT"),
            } satisfies TacticalInstruction;
          })
          .filter((item): item is TacticalInstruction => item !== null);

        setRoles(nextRoles);
        setDuties(nextDuties);
        setPositions(nextPositions);
        setInstructions(nextInstructions);
        setPositionNames(new Map(nextPositions.map(position => [position.id, position.name])));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  return { roles, duties, positions, instructions, positionNames, loading, error };
}
