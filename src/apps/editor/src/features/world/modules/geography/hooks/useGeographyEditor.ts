import { geographyChildKind } from "../config/geographyConfig";
import { useGeography } from "./useGeography";
import { useGeographyFilters } from "./useGeographyFilters";
import { useGeographyEditorForm } from "./useGeographyEditorForm";
import { useGeographyRelations } from "./useGeographyRelations";
import { useGeographyEntityActions } from "./useGeographyEntityActions";

export function useGeographyEditor() {
  const geography = useGeography();
  const filters = useGeographyFilters(geography.tree);
  const form = useGeographyEditorForm(geography.reload);
  const relations = useGeographyRelations(
    geography.selectedNode,
    filters.allRows,
    geography.reload,
  );
  const actions = useGeographyEntityActions(geography.reload);

  const selectedNode = geography.selectedNode;
  const childKind = selectedNode
    ? geographyChildKind[selectedNode.kind]
    : undefined;

  return {
    geography,
    selectedNode,
    childKind,
    query: filters.query,
    filter: filters.filter,
    setQuery: filters.setQuery,
    setFilter: filters.setFilter,
    allRows: filters.allRows,
    filteredRows: filters.filteredRows,
    counts: filters.counts,
    ...form,
    ...relations,
    ...actions,
    formError: form.error,
    relationLoading: relations.loading,
    relationError: relations.error,
    languages: relations.languages,
    climateRows: relations.climateRows,
    error: geography.error ?? form.error ?? relations.error ?? actions.error,
    loading: geography.loading || relations.loading,
  };
}
