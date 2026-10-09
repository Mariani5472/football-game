import { GeographyEditorForm } from "./GeographyEditorForm";
import type { GeographyTreeNode } from "../types";
import type { GeographySpec } from "../config/geographyConfig";
import type { EntityFormValue } from "../../../../../shared/components";

export function GeographyEditorSection({
  spec,
  editing,
  creating,
  values,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}: {
  spec: GeographySpec;
  editing: GeographyTreeNode | null;
  creating: { kind: string; parent?: GeographyTreeNode } | null;
  values: Record<string, EntityFormValue>;
  saving: boolean;
  error: string | null;
  onChange: (name: string, value: EntityFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  if (!editing && !creating) return null;

  return (
    <GeographyEditorForm
      spec={spec}
      editing={editing}
      creating={creating}
      values={values}
      saving={saving}
      error={error}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
