import { useMemo, useState } from "react";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySelection, GeographyTreeNode } from "../types";
import { buildGeographyTree, flattenGeographyTree, findGeographyRow } from "../config/geographyTree";

const pageSize = 1000;

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
  const currencies = useEntityQuery("currency", {
    page: 1, pageSize, orderBy: "name", orderDirection: "ASC",
  });
  const climates = useEntityQuery("climate", {
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

  const allRows = useMemo(() => flattenGeographyTree(tree), [tree]);
  const rowsByTable = useMemo(
    () => ({
      federation: federations.rows,
      continent: continents.rows,
      continentRegion: continentRegions.rows,
      country: countries.rows,
      nationRegion: nationRegions.rows,
      city: cities.rows,
      currency: currencies.rows,
      climate: climates.rows,
    }),
    [
      federations.rows,
      continents.rows,
      continentRegions.rows,
      countries.rows,
      nationRegions.rows,
      cities.rows,
      currencies.rows,
      climates.rows,
    ],
  );

  const selectedNode = useMemo(
    () => allRows.find(node => node.id === selectedId),
    [allRows, selectedId],
  );

  const selection = useMemo<GeographySelection>(() => {
    if (!selectedNode) return {};

    const result: GeographySelection = {};
    const node = selectedNode;

    if (node.kind === "continent") {
      result.continent = node.row;
      return result;
    }

    if (node.kind === "country") {
      result.country = node.row;
      result.continent = findGeographyRow(
        rowsByTable.continent,
        node.row.__continent_id,
      );
      if (!result.continent) {
        const region = findGeographyRow(
          rowsByTable.continentRegion,
          node.row.continent_region_id,
        );
        if (region) {
          result.continentRegion = region;
          result.continent = findGeographyRow(
            rowsByTable.continent,
            region.continent_id,
          );
        }
      }
      return result;
    }

    if (node.kind === "nation-region") {
      result.nationRegion = node.row;
      result.country = findGeographyRow(rowsByTable.country, node.row.nation_id);
      if (result.country) {
        result.continentRegion = findGeographyRow(
          rowsByTable.continentRegion,
          result.country.continent_region_id,
        );
      }
      if (result.continentRegion) {
        result.continent = findGeographyRow(
          rowsByTable.continent,
          result.continentRegion.continent_id,
        );
      }
      return result;
    }

    if (node.kind === "city") {
      result.city = node.row;
      result.nationRegion = findGeographyRow(
        rowsByTable.nationRegion,
        node.row.nation_region_id,
      );
      result.country = findGeographyRow(rowsByTable.country, node.row.nation_id);
      if (!result.country && result.nationRegion) {
        result.country = findGeographyRow(
          rowsByTable.country,
          result.nationRegion.nation_id,
        );
      }
      if (result.country) {
        result.continentRegion = findGeographyRow(
          rowsByTable.continentRegion,
          result.country.continent_region_id,
        );
      }
      if (result.continentRegion) {
        result.continent = findGeographyRow(
          rowsByTable.continent,
          result.continentRegion.continent_id,
        );
      }
      return result;
    }

    return result;
  }, [selectedNode, rowsByTable]);

  const childrenByNode = useMemo(() => {
    const map = new Map<string, GeographyTreeNode[]>();
    for (const node of allRows) map.set(node.id, node.children);
    return map;
  }, [allRows]);

  const counts = useMemo(() => ({
    continents: continents.total,
    countries: countries.total,
    regions: nationRegions.total,
    cities: cities.total,
  }), [continents.total, countries.total, nationRegions.total, cities.total]);

  return {
    tree,
    allRows,
    childrenByNode,
    selectedNode,
    selectedId,
    setSelectedId,
    selection,
    counts,
    loading:
      federations.loading ||
      continents.loading ||
      continentRegions.loading ||
      countries.loading ||
      nationRegions.loading ||
      cities.loading ||
      currencies.loading ||
      climates.loading,
    error:
      federations.error ??
      continents.error ??
      continentRegions.error ??
      countries.error ??
      nationRegions.error ??
      cities.error ??
      currencies.error ??
      climates.error,
    reload: async () => {
      await Promise.all([
        federations.reload(),
        continents.reload(),
        continentRegions.reload(),
        countries.reload(),
        nationRegions.reload(),
        cities.reload(),
        currencies.reload(),
        climates.reload(),
      ]);
    },
    rowsByTable,
  };
}
