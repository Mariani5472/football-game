import type { EntityKey } from "../../../shared/api";

export const templateRoots = [
  ["team", "Team"],
  ["stadium", "Stadium"],
  ["person", "Person"],
  ["player", "Player"],
  ["competition", "Competition"],
  ["formation", "Formation"],
] as const;

export type TemplateRootTable = (typeof templateRoots)[number][0];

export function parseTemplateKey(value: string): EntityKey {
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Record<string, string | number | boolean | null>;
  }

  const numeric = Number(trimmed);
  return trimmed !== "" && Number.isFinite(numeric) ? numeric : trimmed;
}

export function formatTemplateLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/w/g, char => char.toUpperCase());
}
