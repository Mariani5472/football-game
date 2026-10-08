import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographyAncestors, GeographyTreeNode } from "../types";

export function buildGeographyTree(
  _federations: EntityRow[],
  continents: EntityRow[],
  continentRegions: EntityRow[],
  countries: EntityRow[],
  nationRegions: EntityRow[],
  cities: EntityRow[],
): GeographyTreeNode[] {
  const continentToRegions = groupById(continentRegions, "continent_id");
  const regionToCountries = groupById(countries, "continent_region_id");
  const countryToNationRegions = groupById(nationRegions, "nation_id");
  const nationRegionToCities = groupById(cities, "nation_region_id");

  const sortRows = (rows: EntityRow[]) =>
    [...rows].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR"),
    );

  const cityNode = (row: EntityRow): GeographyTreeNode => ({
    id: nodeId("city", row.id),
    entityId: Number(row.id),
    table: "city",
    kind: "city",
    label: String(row.name ?? row.id),
    children: [],
    row,
  });

  const nationRegionNode = (row: EntityRow): GeographyTreeNode => ({
    id: nodeId("nation-region", row.id),
    entityId: Number(row.id),
    table: "nation_region",
    kind: "nation-region",
    label: String(row.name ?? row.id),
    children: sortRows(
      nationRegionToCities.get(Number(row.id)) ?? [],
    ).map(cityNode),
    row,
  });

  const countryNode = (row: EntityRow): GeographyTreeNode => ({
    id: nodeId("country", row.id),
    entityId: Number(row.id),
    table: "nation",
    kind: "country",
    label: String(row.name ?? row.id),
    children: sortRows(
      countryToNationRegions.get(Number(row.id)) ?? [],
    ).map(nationRegionNode),
    row,
  });

  const continentRegionNode = (row: EntityRow): GeographyTreeNode => ({
    id: nodeId("continent-region", row.id),
    entityId: Number(row.id),
    table: "continent_region",
    kind: "continent-region",
    label: String(row.name ?? row.id),
    children: sortRows(
      regionToCountries.get(Number(row.id)) ?? [],
    ).map(countryNode),
    row,
  });

  return sortRows(continents).map(continent => ({
    id: nodeId("continent", continent.id),
    entityId: Number(continent.id),
    table: "continent",
    kind: "continent",
    label: String(continent.name ?? continent.id),
    children: sortRows(
      continentToRegions.get(Number(continent.id)) ?? [],
    ).map(continentRegionNode),
    row: continent,
  }));
}

function groupById(
  rows: EntityRow[],
  key: string,
): Map<number, EntityRow[]> {
  const result = new Map<number, EntityRow[]>();

  for (const row of rows) {
    const value = row[key];
    if (value == null) continue;

    const id = Number(value);
    const list = result.get(id) ?? [];
    list.push(row);
    result.set(id, list);
  }

  return result;
}

function nodeId(kind: string, id: unknown): string {
  return `${kind}-${id}`;
}

export function flattenGeographyTree(
  nodes: GeographyTreeNode[],
): GeographyTreeNode[] {
  return nodes.flatMap(node => [
    node,
    ...flattenGeographyTree(node.children),
  ]);
}

export function findGeographyRow(rows: EntityRow[], id: unknown) {
  if (id == null) return undefined;
  return rows.find(row => Number(row.id) === Number(id));
}

export function findGeographyNode(
  nodes: GeographyTreeNode[],
  id?: string,
): GeographyTreeNode | undefined {
  if (!id) return undefined;

  for (const node of nodes) {
    if (node.id === id) return node;

    const child = findGeographyNode(node.children, id);
    if (child) return child;
  }

  return undefined;
}

export function findAncestors(
  roots: GeographyTreeNode[],
  targetId?: string,
): GeographyAncestors {
  if (!targetId) return {};

  function visit(
    nodes: GeographyTreeNode[],
    ancestors: GeographyAncestors,
  ): GeographyAncestors | undefined {
    for (const node of nodes) {
      const next: GeographyAncestors = {
        ...ancestors,
        ...(node.kind === "continent"
          ? { continent: node }
          : {}),
        ...(node.kind === "continent-region"
          ? { continentRegion: node }
          : {}),
        ...(node.kind === "country"
          ? { country: node }
          : {}),
        ...(node.kind === "nation-region"
          ? { nationRegion: node }
          : {}),
      };

      if (node.id === targetId) return next;

      const found = visit(node.children, next);
      if (found) return found;
    }

    return undefined;
  }

  return visit(roots, {}) ?? {};
}
