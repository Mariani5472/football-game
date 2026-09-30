import { useEffect, useMemo, useState } from "react";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySelection, GeographyTreeNode } from "../types";

function toTree(
  continents: EntityRow[],
  countries: EntityRow[],
  regions: EntityRow[],
  cities: EntityRow[],
): GeographyTreeNode[] {
  return continents.map((continent) => ({
    id: `continent-${continent.id}`,
    label: String(continent.name ?? continent.id),
    kind: "continent",
    entityId: Number(continent.id),
    children: countries
      .filter((country) => Number(country.continent_region_id) === Number(continent.id))
      .map((country) => ({
        id: `country-${country.id}`,
        label: String(country.name ?? country.id),
        kind: "country",
        entityId: Number(country.id),
        children: regions
          .filter((region) => Number(region.nation_id) === Number(country.id))
          .map((region) => ({
            id: `region-${region.id}`,
            label: String(region.name ?? region.id),
            kind: "region",
            entityId: Number(region.id),
            children: cities
              .filter(
                (city) =>
                  Number(city.nation_id) === Number(country.id) &&
                  Number(city.nation_region_id) === Number(region.id),
              )
              .map((city) => ({
                id: `city-${city.id}`,
                label: String(city.name ?? city.id),
                kind: "city",
                entityId: Number(city.id),
              })),
          })),
      })),
  }));
}

export function useGeography() {
  const [selection, setSelection] = useState<GeographySelection>({});

  const continents = useEntityQuery("continent", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const countries = useEntityQuery("nation", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const regions = useEntityQuery("nation_region", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const cities = useEntityQuery("city", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });

  const tree = useMemo(
    () => toTree(continents.rows, countries.rows, regions.rows, cities.rows),
    [continents.rows, countries.rows, regions.rows, cities.rows],
  );

  useEffect(() => {
    if (!selection.city && !selection.region && !selection.country && !selection.continent) return;
    const continent = selection.continent
      ? continents.rows.find((row) => Number(row.id) === selection.continent?.id)
      : undefined;
    const country = selection.country
      ? countries.rows.find((row) => Number(row.id) === selection.country?.id)
      : undefined;
    const region = selection.region
      ? regions.rows.find((row) => Number(row.id) === selection.region?.id)
      : undefined;
    const city = selection.city
      ? cities.rows.find((row) => Number(row.id) === selection.city?.id)
      : undefined;

    setSelection({
      continent: continent
        ? { id: Number(continent.id), name: String(continent.name ?? continent.id), shortName: String(continent.short_name ?? "") }
        : undefined,
      country: country
        ? {
            id: Number(country.id),
            name: String(country.name ?? country.id),
            shortName: String(country.short_name ?? ""),
            continentId: country.continent_region_id == null ? undefined : Number(country.continent_region_id),
          }
        : undefined,
      region: region
        ? {
            id: Number(region.id),
            name: String(region.name ?? region.id),
            shortName: String(region.short_name ?? ""),
            countryId: Number(region.nation_id),
          }
        : undefined,
      city: city
        ? {
            id: Number(city.id),
            name: String(city.name ?? city.id),
            shortName: String(city.short_name ?? ""),
            countryId: Number(city.nation_id),
            regionId: city.nation_region_id == null ? undefined : Number(city.nation_region_id),
            climateId: city.climate_id == null ? undefined : Number(city.climate_id),
          }
        : undefined,
    });
  }, [continents.rows, countries.rows, regions.rows, cities.rows]);

  function selectNode(node: GeographyTreeNode) {
    if (node.kind === "continent") {
      setSelection({
        continent: {
          id: node.entityId,
          name: node.label,
        },
      });
      return;
    }

    if (node.kind === "country") {
      const country = countries.rows.find((row) => Number(row.id) === node.entityId);
      const continent = country
        ? continents.rows.find((row) => Number(row.id) === Number(country.continent_region_id))
        : undefined;
      setSelection({
        continent: continent ? { id: Number(continent.id), name: String(continent.name ?? continent.id) } : undefined,
        country: country
          ? {
              id: Number(country.id),
              name: String(country.name ?? country.id),
              shortName: String(country.short_name ?? ""),
              continentId: country.continent_region_id == null ? undefined : Number(country.continent_region_id),
            }
          : undefined,
      });
      return;
    }

    if (node.kind === "region") {
      const region = regions.rows.find((row) => Number(row.id) === node.entityId);
      const country = region
        ? countries.rows.find((row) => Number(row.id) === Number(region.nation_id))
        : undefined;
      const continent = country
        ? continents.rows.find((row) => Number(row.id) === Number(country.continent_region_id))
        : undefined;
      setSelection({
        continent: continent ? { id: Number(continent.id), name: String(continent.name ?? continent.id) } : undefined,
        country: country ? { id: Number(country.id), name: String(country.name ?? country.id), shortName: String(country.short_name ?? "") } : undefined,
        region: region ? { id: Number(region.id), name: String(region.name ?? region.id), shortName: String(region.short_name ?? ""), countryId: Number(region.nation_id) } : undefined,
      });
      return;
    }

    if (node.kind === "city") {
      const city = cities.rows.find((row) => Number(row.id) === node.entityId);
      if (!city) return;
      const region = city.nation_region_id == null
        ? undefined
        : regions.rows.find((row) => Number(row.id) === Number(city.nation_region_id));
      const country = countries.rows.find((row) => Number(row.id) === Number(city.nation_id));
      const continent = country
        ? continents.rows.find((row) => Number(row.id) === Number(country.continent_region_id))
        : undefined;
      setSelection({
        continent: continent ? { id: Number(continent.id), name: String(continent.name ?? continent.id) } : undefined,
        country: country ? { id: Number(country.id), name: String(country.name ?? country.id), shortName: String(country.short_name ?? "") } : undefined,
        region: region ? { id: Number(region.id), name: String(region.name ?? region.id), shortName: String(region.short_name ?? ""), countryId: Number(region.nation_id) } : undefined,
        city: {
          id: Number(city.id),
          name: String(city.name ?? city.id),
          shortName: String(city.short_name ?? ""),
          countryId: Number(city.nation_id),
          regionId: city.nation_region_id == null ? undefined : Number(city.nation_region_id),
          climateId: city.climate_id == null ? undefined : Number(city.climate_id),
        },
      });
    }
  }

  return {
    tree,
    selection,
    selectNode,
    loading: continents.loading || countries.loading || regions.loading || cities.loading,
    error: continents.error ?? countries.error ?? regions.error ?? cities.error,
    reload: async () => {
      await Promise.all([
        continents.reload(),
        countries.reload(),
        regions.reload(),
        cities.reload(),
      ]);
    },
  };
}
