import type { EntityRow, Scalar } from "../../api/editorApi";

export interface RelationColumn {
  key: string;
  header: string;
  type?: "text" | "number" | "percentage" | "weight";
  editable?: boolean;
}

export interface RelationDefinition {
  table: string;
  ownerColumns: string[];
  targetColumn: string;
  keyColumns: string[];
  targetTable: string;
  targetLabelColumn?: string;
  valueColumns?: string[];
}

export interface RelationDraft {
  targetId: number | string;
  values: Record<string, Scalar>;
}

export interface RelationTableProps {
  title: string;
  relation: RelationDefinition;
  owner: Record<string, Scalar>;
  rows: EntityRow[];
  targetRows: EntityRow[];
  columns: RelationColumn[];
  loading?: boolean;
  error?: string | null;
  onSave: (items: RelationDraft[]) => Promise<void>;
  emptyMessage?: string;
}
