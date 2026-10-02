import type { ReactNode } from "react";
import { RelationTable, type RelationColumn, type RelationDefinition, type RelationDraft } from "../../../../../shared/components";
import type { EntityRow, Scalar } from "../../../../../shared/api/editorApi";

export interface RelationshipEditorProps {
  title: string;
  rows: EntityRow[];
  targetRows: EntityRow[];
  targetColumn: string;
  targetLabel: string;
  loading: boolean;
  error?: string | null;
  onAdd: (targetId: number) => void;
  onChange: (row: EntityRow, targetId: number) => void;
  onRemove: (row: EntityRow) => void;
  percentage?: boolean;
  onPercentageChange?: (row: EntityRow, value: number) => void;
}

export function LanguageRelationshipEditor({
  title,
  table,
  ownerColumn,
  ownerId,
  rows,
  languages,
  loading,
  error,
  onSave,
}: {
  title: string;
  table: string;
  ownerColumn: string;
  ownerId: number;
  rows: EntityRow[];
  languages: EntityRow[];
  loading: boolean;
  error?: string | null;
  onSave: (items: RelationDraft[]) => Promise<void>;
}) {
  const relation: RelationDefinition = {
    table,
    ownerColumns: [ownerColumn],
    targetColumn: "language_id",
    keyColumns: [ownerColumn, "language_id"],
    targetTable: "language",
    targetLabelColumn: "name",
    valueColumns: ["percentage"],
  };

  const columns: RelationColumn[] = [
    { key: "language_id", header: "Language" },
    { key: "percentage", header: "%", type: "percentage", editable: true },
  ];

  return (
    <RelationTable
      title={title}
      relation={relation}
      owner={{ [ownerColumn]: ownerId }}
      rows={rows}
      targetRows={languages}
      columns={columns}
      loading={loading}
      error={error}
      onSave={onSave}
    />
  );
}

export function RelationList({
  title,
  rows,
  targetRows = [],
  targetKey,
  loading,
  error,
  onRemove,
  onAdd,
  action = "Add",
}: {
  title: string;
  rows: EntityRow[];
  targetRows?: EntityRow[];
  labels?: Map<string, string>;
  targetKey?: string;
  loading: boolean;
  error?: string | null;
  onRemove: (row: EntityRow) => void;
  onAdd?: () => void;
  action?: string;
}) {
  const labels = new Map(
    targetRows.map(row => [String(row.id), String(row.name ?? row.full_name ?? row.short_name ?? row.id)]),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {onAdd && (
          <button type="button" onClick={onAdd} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
            + {action}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {loading && <div className="text-xs text-slate-600">Loading...</div>}
        {error && <div className="text-xs text-red-300">{error}</div>}
        {!loading && !rows.length && <div className="text-xs text-slate-600">No relationships.</div>}
        {rows.map(row => (
          <div key={String(row.id ?? JSON.stringify(row))} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <span className="text-xs text-slate-300">
              {labels.get(String(targetKey ? row[targetKey] : row.name ?? row.id)) ?? String(targetKey ? row[targetKey] : row.name ?? row.id ?? "—")}
            </span>
            <button type="button" onClick={() => onRemove(row)} className="text-xs text-red-300">Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface RelationshipEditorLegacyProps extends RelationshipEditorProps {}

export function RelationshipEditor(props: RelationshipEditorProps) {
  return (
    <LanguageRelationshipEditor
      title={props.title}
      table={props.rows.length ? String("") : String("")}
      ownerColumn=""
      ownerId={0}
      rows={props.rows}
      languages={props.targetRows}
      loading={props.loading}
      error={props.error}
      onSave={async () => undefined}
    />
  );
}

export function InlineRelationField({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}
