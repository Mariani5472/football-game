import { useMemo, useState } from "react";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySelection, GeographyTreeNode } from "../types";

import { buildGeographyTree, flattenGeographyTree, findGeographyRow } from "../config/geographyTree";

const pageSize = 100;

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
    () => buildGeographyTree(
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
    () => flattenGeographyTree(tree).find(node => node.id === selectedId),
    [tree, selectedId],
  );

  const selection = useMemo<GeographySelection>(() => {
    if (!selectedNode) return {};

    const result: GeographySelection = {};
    const node = selectedNode;
    if (node.kind === "federation") {
      result.federation = node.row;
      return result;
    }

    if (node.kind === "continent") {
      result.continent = node.row;
      result.federation = findGeographyRow(rowsByTable.federation, node.row.federation_id);
      return result;
    }

    if (node.kind === "continent-region") {
      result.continent = findGeographyRow(rowsByTable.continent, node.row.continent_id);
      result.continentRegion = node.row;
      if (result.continent) {
        result.federation = findGeographyRow(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "country") {
      result.country = node.row;
      result.continentRegion = findGeographyRow(rowsByTable.continentRegion, node.row.continent_region_id);
      if (result.continentRegion) {
        result.continent = findGeographyRow(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findGeographyRow(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "nation-region") {
      result.nationRegion = node.row;
      result.country = findGeographyRow(rowsByTable.country, node.row.nation_id);
      if (result.country) {
        result.continentRegion = findGeographyRow(rowsByTable.continentRegion, result.country.continent_region_id);
      }
      if (result.continentRegion) {
        result.continent = findGeographyRow(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findGeographyRow(rowsByTable.federation, result.continent.federation_id);
      }
      return result;
    }

    if (node.kind === "city") {
      result.city = node.row;
      result.nationRegion = findGeographyRow(rowsByTable.nationRegion, node.row.nation_region_id);
      result.country = findGeographyRow(rowsByTable.country, node.row.nation_id);
      if (result.nationRegion?.nation_id != null && !result.country) {
        result.country = findGeographyRow(rowsByTable.country, result.nationRegion.nation_id);
      }
      if (result.country) {
        result.continentRegion = findGeographyRow(rowsByTable.continentRegion, result.country.continent_region_id);
      }
      if (result.continentRegion) {
        result.continent = findGeographyRow(rowsByTable.continent, result.continentRegion.continent_id);
      }
      if (result.continent) {
        result.federation = findGeographyRow(rowsByTable.federation, result.continent.federation_id);
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
