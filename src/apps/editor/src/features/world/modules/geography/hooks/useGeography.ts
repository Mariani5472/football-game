import { useMemo, useState } from "react";

import {
  cities,
  continents,
  countries,
  nationRegions,
  regions,
} from "../../../data/world.data";

import type {
  City,
  Continent,
  Country,
  Region,
} from "../../../types";

import type {
  GeographySelection,
  GeographyTreeNode,
} from "../types";

export function useGeography() {
  const [selection, setSelection] =
    useState<GeographySelection>({});

  const tree = useMemo<
    GeographyTreeNode[]
  >(
    () =>
      continents.map((continent) => ({
        id: `continent-${continent.id}`,
        label: continent.name,
        kind: "continent",
        entityId: continent.id,

        children: countries
          .filter(
            (country) =>
              country.continentId === continent.id,
          )
          .map((country) => ({
            id: `country-${country.id}`,
            label: country.name,
            kind: "country",
            entityId: country.id,

            children: regions
              .filter(
                (region) =>
                  region.countryId === country.id,
              )
              .map((region) => ({
                id: `region-${region.id}`,
                label: region.name,
                kind: "region",
                entityId: region.id,

                children: cities
                  .filter(
                    (city) =>
                      city.countryId === country.id &&
                      city.regionId === region.id,
                  )
                  .map((city) => ({
                    id: `city-${city.id}`,
                    label: city.name,
                    kind: "city",
                    entityId: city.id,
                  })),
              })),
          })),
      })),
    [],
  );

  function selectContinent(
    continent: Continent,
  ) {
    setSelection({
      continent,
    });
  }

  function selectCountry(
    country: Country,
  ) {
    const continent =
      continents.find(
        (item) =>
          item.id === country.continentId,
      );

    setSelection({
      continent,
      country,
    });
  }

  function selectRegion(
    region: Region,
  ) {
    const country =
      countries.find(
        (item) =>
          item.id === region.countryId,
      );

    const continent =
      continents.find(
        (item) =>
          item.id === country?.continentId,
      );

    setSelection({
      continent,
      country,
      region,
    });
  }

  function selectCity(city: City) {
    const country =
      countries.find(
        (item) =>
          item.id === city.countryId,
      );

    const continent =
      continents.find(
        (item) =>
          item.id === country?.continentId,
      );

    const region =
      regions.find(
        (item) =>
          item.id === city.regionId,
      );

    const nationRegion =
      nationRegions.find(
        (item) =>
          item.id === city.regionId,
      );

    setSelection({
      continent,
      country,
      region,
      nationRegion,
      city,
    });
  }

  function selectNode(
    node: GeographyTreeNode,
  ) {
    switch (node.kind) {
      case "continent": {
        const entity =
          continents.find(
            (item) =>
              item.id === node.entityId,
          );

        if (entity) {
          selectContinent(entity);
        }

        break;
      }

      case "country": {
        const entity =
          countries.find(
            (item) =>
              item.id === node.entityId,
          );

        if (entity) {
          selectCountry(entity);
        }

        break;
      }

      case "region": {
        const entity =
          regions.find(
            (item) =>
              item.id === node.entityId,
          );

        if (entity) {
          selectRegion(entity);
        }

        break;
      }

      case "city": {
        const entity =
          cities.find(
            (item) =>
              item.id === node.entityId,
          );

        if (entity) {
          selectCity(entity);
        }

        break;
      }

      case "nation-region":
        break;
    }
  }

  return {
    tree,
    selection,
    selectNode,
  };
}