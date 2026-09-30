import { useEffect, useMemo, useState } from "react";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode } from "../types";

type RelationState = { table: string; ownerColumn: string } | undefined;

export function useGeographyRelations(
  selectedNode: GeographyTreeNode | undefined,
  allRows: GeographyTreeNode[],
  reloadGeography: () => Promise<void>,
) {
  const relation: RelationState =
    selectedNode?.kind === "country"
      ? { table: "nation_language", ownerColumn: "nation_id" }
      : selectedNode?.kind === "nation-region"
        ? { table: "nation_region_language", ownerColumn: "nation_region_id" }
        : selectedNode?.kind === "city"
          ? { table: "city_language", ownerColumn: "city_id" }
          : undefined;

  const [relationRows, setRelationRows] = useState<EntityRow[]>([]);
  const [languages, setLanguages] = useState<EntityRow[]>([]);
  const [climates, setClimates] = useState<EntityRow[]>([]);
  const [altNames, setAltNames] = useState<EntityRow[]>([]);
  const [nativeTreatments, setNativeTreatments] = useState<EntityRow[]>([]);
  const [regionalClimates, setRegionalClimates] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerKey = selectedNode?.entityId ?? null;

  const countryRows = useMemo(
    () => allRows.filter(node => node.kind === "country"),
    [allRows],
  );

  async function list(table: string) {
    return (
      await editorApi.list(table, {
        page: 1,
        pageSize: 1000,
        orderBy: "id",
        orderDirection: "ASC",
      })
    ).rows;
  }

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [languageRows, climateRows, alternativeRows, treatmentRows, regionalRows] =
        await Promise.all([
          editorApi.list("language", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }).then(result => result.rows),
          editorApi.list("climate", { page: 1, pageSize: 1000, orderBy: "name", orderDirection: "ASC" }).then(result => result.rows),
          list("continent_alt_name"),
          list("nation_native_treatment"),
          list("climate_nation_region"),
        ]);

      setLanguages(languageRows);
      setClimates(climateRows);
      setAltNames(ownerKey == null ? [] : alternativeRows.filter(row => selectedNode?.kind === "continent" && Number(row.continent_id) === ownerKey));
      setNativeTreatments(ownerKey == null ? [] : treatmentRows.filter(row => selectedNode?.kind === "country" && Number(row.root_nation_id) === ownerKey));
      setRegionalClimates(ownerKey == null ? [] : regionalRows.filter(row => selectedNode?.kind === "nation-region" && Number(row.nation_region_id) === ownerKey));

      if (relation && ownerKey != null) {
        const rows = await list(relation.table);
        setRelationRows(rows.filter(row => Number(row[relation.ownerColumn]) === ownerKey));
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
  }, [relation?.table, ownerKey, selectedNode?.kind]);

  async function saveLanguages(items: { targetId: number | string; values: Record<string, string | number | boolean | null> }[]) {
    if (!selectedNode || !relation) return;
    const keep = new Map(items.map(item => [String(item.targetId), item]));
    for (const row of relationRows) {
      const target = keep.get(String(row.language_id));
      if (!target) await editorApi.remove(relation.table, row.id as number);
      else await editorApi.update(relation.table, row.id as number, target.values);
    }
    for (const item of items) {
      if (!relationRows.some(row => String(row.language_id) === String(item.targetId))) {
        await editorApi.create(relation.table, {
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
    await editorApi.create("continent_alt_name", {
      continent_id: selectedNode.entityId,
      name: name.trim(),
    });
    await reload();
  }

  async function removeAlternativeName(row: EntityRow) {
    await editorApi.remove("continent_alt_name", row.id as number);
    await reload();
  }

  async function addNativeTreatment() {
    if (selectedNode?.kind !== "country") return;
    const target = countryRows.find(
      node =>
        node.entityId !== selectedNode.entityId &&
        !nativeTreatments.some(row => Number(row.target_nation_id) === node.entityId),
    );
    if (!target) return;
    await editorApi.create("nation_native_treatment", {
      root_nation_id: selectedNode.entityId,
      target_nation_id: target.entityId,
    });
    await reload();
  }

  async function removeNativeTreatment(row: EntityRow) {
    await editorApi.remove("nation_native_treatment", row.id as number);
    await reload();
  }

  async function addRegionalClimate() {
    if (selectedNode?.kind !== "nation-region") return;
    const climate = climates.find(
      row => !regionalClimates.some(
        current => Number(current.climate_id) === Number(row.id),
      ),
    );
    if (!climate) return;
    await editorApi.create("climate_nation_region", {
      nation_region_id: selectedNode.entityId,
      climate_id: climate.id,
    });
    await reload();
  }

  async function removeRegionalClimate(row: EntityRow) {
    await editorApi.remove("climate_nation_region", row.id as number);
    await reload();
  }

  async function updateCityClimate(value: number | string) {
    if (selectedNode?.kind !== "city") return;
    await editorApi.update("city", selectedNode.entityId, {
      climate_id: value === "" ? null : Number(value),
    });
    await reloadGeography();
  }

  return {
    relation,
    relationRows,
    languages,
    climateRows: climates,
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
