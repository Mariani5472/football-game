import { useMemo, useState } from "react";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySelection, GeographyTreeNode } from "../types";

const pageSize = 100;

function buildTree(
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

function flattenTree(nodes: GeographyTreeNode[]): GeographyTreeNode[] {
  return nodes.flatMap(node => [node, ...flattenTree(node.children)]);
}

function findById(rows: EntityRow[], id: unknown) {
  if (id == null) return undefined;
  return rows.find(row => Number(row.id) === Number(id));
}

export function useGeography() {
  const [selectedId, setSelectedId] = useState<string>();

  const federations = useEntityQuery("federation", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const continents = useEntityQuery("continent", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const continentRegions = useEntityQuery("continent_region", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const countries = useEntityQuery("nation", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const nationRegions = useEntityQuery("nation_region", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const cities = useEntityQuery("city", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });

  const tree = useMemo(
    () => buildTree(
      federations.rows,
      continents.rows,
      continentRegions.rows,
      countries.rows,
      nationRegions.rows,
      cities.rows,
    ),
    [
      federations.rows,
      continents.rows,
      continentRegions.rows,
      countries.rows,
      nationRegions.rows,
      cities.rows,
    ],
  );

  const rowsByTable = useMemo(
    () => ({
      federation: federations.rows,
      continent: continents.rows,
      continentRegion: continentRegions.rows,
      country: countries.rows,
      nationRegion: nationRegions.rows,
      city: cities.rows,
    }),
    [
      federations.rows,
      continents.rows,
      continentRegions.rows,
      countries.rows,
      nationRegions.rows,
      cities.rows,
    ],
  );

  const selectedNode = useMemo(
    () => flattenTree(tree).find(node => node.id === selectedId),
    [tree, selectedId],
  );

  const selection = useMemo<GeographySelection>(() => {
    if (!selectedNode) return {};

    const result: GeographySelection = {};
    if (node.kind === "federation") {
      result.federation = node.row;
      return result;
    }

    if (node.kind === "continent") {
      result.continent = node.row;
      result.federation = findById(rowsByTable.federation, node.row.federation_id);
      return result;
    }

    if (node.kind === "continent-region") {
      result.continent = findById(rowsByTable.continent, node.row.continent_id);
      result.continentRegion = node.row;
      if (result.continent) {
        result.federation = findById(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "country") {
      result.country = node.row;
      result.continentRegion = findById(rowsByTable.continentRegion, node.row.continent_region_id);
      if (result.continentRegion) {
        result.continent = findById(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findById(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "nation-region") {
      result.nationRegion = node.row;
      result.country = findById(rowsByTable.country, node.row.nation_id);
      if (result.country) {
        result.continentRegion = findById(rowsByTable.continentRegion, result.country.continent_region_id);
      }
      if (result.continentRegion) {
        result.continent = findById(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findById(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "city") {
      result.city = node.row;
      result.nationRegion = findById(rowsByTable.nationRegion, node.row.nation_region_id);
      result.country = findById(rowsByTable.country, node.row.nation_id);
      if (result.nationRegion?.nation_id != null && !result.country) {
        result.country = findById(rowsByTable.country, result.nationRegion.nation_id);
      }
      if (result.country) {
        result.continentRegion = findById(rowsByTable.continentRegion, result.country.continent_region_id);
      }
      if (result.continentRegion) {
        result.continent = findById(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findById(rowsByTable.federation, result.continent.federation_id);
      }
    }

    return result;
  }, [selectedNode, rowsByTable]);

  return {
    tree,
    selectedNode,
    selectedId,
    setSelectedId,
    selection,
    loading:
      federations.loading ||
      continents.loading ||
      continentRegions.loading ||
      countries.loading ||
      nationRegions.loading ||
      cities.loading,
    error:
      federations.error ??
      continents.error ??
      continentRegions.error ??
      countries.error ??
      nationRegions.error ??
      cities.error,
    reload: async () => {
      await Promise.all([
        federations.reload(),
        continents.reload(),
        continentRegions.reload(),
        countries.reload(),
        nationRegions.reload(),
        cities.reload(),
      ]);
    },
  };
}
