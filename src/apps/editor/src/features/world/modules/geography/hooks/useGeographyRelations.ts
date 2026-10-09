import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode } from "../types";

export function useGeographyRelations(
  selectedNode: GeographyTreeNode | undefined,
  allRows: GeographyTreeNode[],
  reloadGeography: () => Promise<void>,
) {
  const [relationRows, setRelationRows] = useState<EntityRow[]>([]);
  const [languages, setLanguages] = useState<EntityRow[]>([]);
  const [climateRows, setClimateRows] = useState<EntityRow[]>([]);
  const [altNames, setAltNames] = useState<EntityRow[]>([]);
  const [nativeTreatments, setNativeTreatments] = useState<EntityRow[]>([]);
  const [regionalClimates, setRegionalClimates] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relation =
    selectedNode?.kind === "country"
      ? { table: "nation_language", ownerColumn: "nation_id" }
      : selectedNode?.kind === "nation-region"
        ? { table: "nation_region_language", ownerColumn: "nation_region_id" }
        : selectedNode?.kind === "city"
          ? { table: "city_language", ownerColumn: "city_id" }
          : undefined;

  async function list(table: string, orderBy = "id") {
    return (
      await editorApi.entity.list(table, {
        page: 1,
        pageSize: 1000,
        orderBy,
        orderDirection: "ASC",
      })
    ).rows;
  }

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [languageRows, climates, alternatives, treatments, regional] =
        await Promise.all([
          list("language", "name"),
          list("climate", "name"),
          list("continent_alt_name", "name"),
          list("nation_native_treatment"),
          list("climate_nation_region"),
        ]);

      setLanguages(languageRows);
      setClimateRows(climates);
      setAltNames(
        selectedNode?.kind === "continent"
          ? alternatives.filter(row => Number(row.continent_id) === selectedNode.entityId)
          : [],
      );
      setNativeTreatments(
        selectedNode?.kind === "country"
          ? treatments.filter(row => Number(row.root_nation_id) === selectedNode.entityId)
          : [],
      );
      setRegionalClimates(
        selectedNode?.kind === "nation-region"
          ? regional.filter(row => Number(row.nation_region_id) === selectedNode.entityId)
          : [],
      );

      if (relation && selectedNode) {
        const rows = await list(relation.table);
        setRelationRows(
          rows.filter(row => Number(row[relation.ownerColumn]) === selectedNode.entityId),
        );
      } else {
        setRelationRows([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [selectedNode?.kind, selectedNode?.entityId, relation?.table]);

  async function saveLanguages(
    items: { targetId: number | string; values: Record<string, string | number | boolean | null> }[],
  ) {
    if (!selectedNode || !relation) return;
    const keep = new Map(items.map(item => [String(item.targetId), item]));

    for (const row of relationRows) {
      const item = keep.get(String(row.language_id));
      if (!item) {
        await editorApi.entity.remove(relation.table, row.id as number);
      } else {
        await editorApi.entity.update(relation.table, row.id as number, item.values);
      }
    }

    for (const item of items) {
      if (!relationRows.some(row => String(row.language_id) === String(item.targetId))) {
        await editorApi.entity.create(relation.table, {
          [relation.ownerColumn]: selectedNode.entityId,
          language_id: item.targetId,
          percentage: item.values.percentage ?? 0,
        });
      }
    }
    await reload();
  }

  async function addAlternativeName() {
    if (selectedNode?.kind !== "continent") return;
    const name = window.prompt("Alternative continent name");
    if (!name?.trim()) return;
    await editorApi.entity.create("continent_alt_name", { continent_id: selectedNode.entityId, name: name.trim() });
    await reload();
  }

  async function removeAlternativeName(row: EntityRow) {
    await editorApi.entity.remove("continent_alt_name", row.id as number);
    await reload();
  }

  async function addNativeTreatment() {
    if (selectedNode?.kind !== "country") return;
    const target = allRows.find(
      node =>
        node.kind === "country" &&
        node.entityId !== selectedNode.entityId &&
        !nativeTreatments.some(row => Number(row.target_nation_id) === node.entityId),
    );
    if (!target) return;
    await editorApi.entity.create("nation_native_treatment", {
      root_nation_id: selectedNode.entityId,
      target_nation_id: target.entityId,
    });
    await reload();
  }

  async function removeNativeTreatment(row: EntityRow) {
    await editorApi.entity.remove("nation_native_treatment", row.id as number);
    await reload();
  }

  async function addRegionalClimate() {
    if (selectedNode?.kind !== "nation-region") return;
    const climate = climateRows.find(
      row => !regionalClimates.some(current => Number(current.climate_id) === Number(row.id)),
    );
    if (!climate) return;
    await editorApi.entity.create("climate_nation_region", {
      nation_region_id: selectedNode.entityId,
      climate_id: climate.id,
    });
    await reload();
  }

  async function removeRegionalClimate(row: EntityRow) {
    await editorApi.entity.remove("climate_nation_region", row.id as number);
    await reload();
  }

  async function updateCityClimate(value: number | string) {
    if (selectedNode?.kind !== "city") return;
    await editorApi.entity.update("city", selectedNode.entityId, {
      climate_id: value === "" ? null : Number(value),
    });
    await reloadGeography();
  }

  return {
    relation,
    relationRows,
    languages,
    climateRows,
    altNames,
    nativeTreatments,
    regionalClimates,
    loading,
    error,
    saveLanguages,
    addAlternativeName,
    removeAlternativeName,
    addNativeTreatment,
    removeNativeTreatment,
    addRegionalClimate,
    removeRegionalClimate,
    updateCityClimate,
  };
}
