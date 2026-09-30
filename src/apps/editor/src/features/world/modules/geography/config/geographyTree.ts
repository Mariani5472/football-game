import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode } from "../types";

export function buildGeographyTree(
  federations: EntityRow[],
  continents: EntityRow[],
  continentRegions: EntityRow[],
  countries: EntityRow[],
  nationRegions: EntityRow[],
  cities: EntityRow[],
): GeographyTreeNode[] {
  const federationToContinents = new Map<number, EntityRow[]>();
  const continentToRegions = new Map<number, EntityRow[]>();
  const regionToCountries = new Map<number, EntityRow[]>();
  const countryToNationRegions = new Map<number, EntityRow[]>();
  const nationRegionToCities = new Map<number, EntityRow[]>();

  for (const row of continents) {
    if (row.federation_id == null) continue;
    const list = federationToContinents.get(Number(row.federation_id)) ?? [];
    list.push(row);
    federationToContinents.set(Number(row.federation_id), list);
  }

  for (const row of continentRegions) {
    const list = continentToRegions.get(Number(row.continent_id)) ?? [];
    list.push(row);
    continentToRegions.set(Number(row.continent_id), list);
  }

  for (const row of countries) {
    if (row.continent_region_id == null) continue;
    const list = regionToCountries.get(Number(row.continent_region_id)) ?? [];
    list.push(row);
    regionToCountries.set(Number(row.continent_region_id), list);
  }

  for (const row of nationRegions) {
    const list = countryToNationRegions.get(Number(row.nation_id)) ?? [];
    list.push(row);
    countryToNationRegions.set(Number(row.nation_id), list);
  }

  for (const row of cities) {
    if (row.nation_region_id == null) continue;
    const list = nationRegionToCities.get(Number(row.nation_region_id)) ?? [];
    list.push(row);
    nationRegionToCities.set(Number(row.nation_region_id), list);
  }

  const sortRows = (rows: EntityRow[]) =>
    [...rows].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? "")),
    );

  const cityNode = (row: EntityRow): GeographyTreeNode => ({
    id: `city-${row.id}`,
    entityId: Number(row.id),
    table: "city",
    kind: "city",
    label: String(row.name ?? row.id),
    children: [],
    row,
  });

  const nationRegionNode = (row: EntityRow): GeographyTreeNode => ({
    id: `nation-region-${row.id}`,
    entityId: Number(row.id),
    table: "nation_region",
    kind: "nation-region",
    label: String(row.name ?? row.id),
    children: sortRows(nationRegionToCities.get(Number(row.id)) ?? []).map(cityNode),
    row,
  });

  const countryNode = (row: EntityRow): GeographyTreeNode => ({
    id: `country-${row.id}`,
    entityId: Number(row.id),
    table: "nation",
    kind: "country",
    label: String(row.name ?? row.id),
    children: sortRows(countryToNationRegions.get(Number(row.id)) ?? []).map(nationRegionNode),
    row,
  });

  const continentRegionNode = (row: EntityRow): GeographyTreeNode => ({
    id: `continent-region-${row.id}`,
    entityId: Number(row.id),
    table: "continent_region",
    kind: "continent-region",
    label: String(row.name ?? row.id),
    children: sortRows(regionToCountries.get(Number(row.id)) ?? []).map(countryNode),
    row,
  });

  const continentNode = (row: EntityRow): GeographyTreeNode => ({
    id: `continent-${row.id}`,
    entityId: Number(row.id),
    table: "continent",
    kind: "continent",
    label: String(row.name ?? row.id),
    children: sortRows(continentToRegions.get(Number(row.id)) ?? []).map(continentRegionNode),
    row,
  });

  const roots = sortRows(federations).map((federation): GeographyTreeNode => ({
    id: `federation-${federation.id}`,
    entityId: Number(federation.id),
    table: "federation",
    kind: "federation",
    label: String(federation.name ?? federation.id),
    children: sortRows(federationToContinents.get(Number(federation.id)) ?? []).map(continentNode),
    row: federation,
  }));

  const attachedContinentIds = new Set(
    roots.flatMap(root => root.children.map(child => child.entityId)),
  );

  const orphanContinents = sortRows(continents)
    .filter(row => !attachedContinentIds.has(Number(row.id)))
    .map(continentNode);

  return [...roots, ...orphanContinents];
}


export function flattenGeographyTree(nodes: GeographyTreeNode[]): GeographyTreeNode[] {
  return nodes.flatMap(node => [node, ...flattenGeographyTree(node.children)]);
}

export function findGeographyRow(rows: EntityRow[], id: unknown) {
  if (id == null) return undefined;
  return rows.find(row => Number(row.id) === Number(id));
}
