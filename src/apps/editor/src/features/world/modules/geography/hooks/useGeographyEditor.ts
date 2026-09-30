import { geographyChildKind } from "../config/geographyConfig";
import { useGeography } from "./useGeography";
import { useGeographyFilters } from "./useGeographyFilters";
import { useGeographyEditorForm } from "./useGeographyEditorForm";
import { useGeographyRelations } from "./useGeographyRelations";

export function useGeographyEditor() {
  const geography = useGeography();
  const filters = useGeographyFilters(geography.tree);
  const form = useGeographyEditorForm(geography.reload);
  const relations = useGeographyRelations(
    geography.selectedNode,
    filters.allRows,
    geography.reload,
  );

  return {
    geography,
    ...filters,
    ...form,
    ...relations,
    selectedNode: geography.selectedNode,
    childKind: geography.selectedNode
      ? geographyChildKind[geography.selectedNode.kind]
      : undefined,
    error: geography.error ?? form.error ?? relations.error,
    loading: geography.loading || form.saving || relations.loading,
  };
}
