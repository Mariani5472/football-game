import { useMemo, useState } from "react";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySelection, GeographyStats, GeographyTreeNode } from "../types";
import {
  buildGeographyTree,
  findAncestors,
  findGeographyNode,
  flattenGeographyTree,
} from "../config/geographyTree";

const PAGE_SIZE = 1000;

export function useGeography() {
  const [selectedId, setSelectedId] = useState<string>();

  const federations = useEntityQuery("federation", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const continents = useEntityQuery("continent", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const continentRegions = useEntityQuery("continent_region", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const countries = useEntityQuery("nation", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const nationRegions = useEntityQuery("nation_region", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const cities = useEntityQuery("city", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const currencies = useEntityQuery("currency", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });
  const climates = useEntityQuery("climate", {
    page: 1,
    pageSize: PAGE_SIZE,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const tree = useMemo(
    () =>
      buildGeographyTree(
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

  const allRows = useMemo(
    () => flattenGeographyTree(tree),
    [tree],
  );

  const selectedNode = useMemo(
    () => findGeographyNode(tree, selectedId),
    [tree, selectedId],
  );

  const ancestors = useMemo(
    () => findAncestors(tree, selectedId),
    [tree, selectedId],
  );

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

  const selection = useMemo<GeographySelection>(() => ({
    continent: ancestors.continent?.row,
    continentRegion: ancestors.continentRegion?.row,
    country: ancestors.country?.row,
    nationRegion: ancestors.nationRegion?.row,
    city: selectedNode?.kind === "city" ? selectedNode.row : undefined,
  }), [ancestors, selectedNode]);

  const counts = useMemo<GeographyStats>(
    () => ({
      continents: continents.total,
      geographicRegions: continentRegions.total,
      countries: countries.total,
      administrativeRegions: nationRegions.total,
      cities: cities.total,
    }),
    [
      continents.total,
      continentRegions.total,
      countries.total,
      nationRegions.total,
      cities.total,
    ],
  );

  const loading =
    federations.loading ||
    continents.loading ||
    continentRegions.loading ||
    countries.loading ||
    nationRegions.loading ||
    cities.loading ||
    currencies.loading ||
    climates.loading;

  const error =
    federations.error ??
    continents.error ??
    continentRegions.error ??
    countries.error ??
    nationRegions.error ??
    cities.error ??
    currencies.error ??
    climates.error;

  return {
    tree,
    allRows,
    selectedNode,
    selectedId,
    setSelectedId,
    ancestors,
    selection,
    counts,
    loading,
    error,
    rowsByTable,
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
  };
}
