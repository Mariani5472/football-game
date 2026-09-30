import { Plus } from "lucide-react";
import { DataTable } from "../../../../../shared/components";
import type { EntityRow } from "../../../../../shared/api/editorApi";

interface LanguageRelationsProps {
  rows: EntityRow[];
  languages: EntityRow[];
  loading: boolean;
  error?: string | null;
  onAdd: () => void;
  onUpdate: (row: EntityRow, percentage: number) => void;
  onRemove: (row: EntityRow) => void;
}

export function LanguageRelations({
  rows,
  languages,
  loading,
  error,
  onAdd,
  onUpdate,
  onRemove,
}: LanguageRelationsProps) {
  return (
    <RelationCard title="Language percentages" action="Add language" loading={loading} onAdd={onAdd}>
      <DataTable
        rows={rows.map(row => ({
          ...row,
          language_name:
            languages.find(language => Number(language.id) === Number(row.language_id))?.name ??
            row.language_id,
        }))}
        columns={[
          {
            key: "language_name",
            header: "Language",
            render: row => String(row.language_name ?? "—"),
          },
          {
            key: "percentage",
            header: "%",
            render: row => (
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={String(row.percentage ?? 0)}
                onBlur={event => onUpdate(row, Number(event.target.value))}
                className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white"
              />
            ),
          },
          {
            key: "actions",
            header: "",
            render: row => (
              <button type="button" onClick={() => onRemove(row)} className="text-xs text-red-300">
                Remove
              </button>
            ),
          },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No language relationships."
      />
    </RelationCard>
  );
}

interface RelationListProps {
  title: string;
  rows: EntityRow[];
  labels: Map<string, string>;
  targetKey: string;
  loading: boolean;
  error?: string | null;
  onAdd: () => void;
  onRemove: (row: EntityRow) => void;
  action?: string;
}

export function RelationList({
  title,
  rows,
  labels,
  targetKey,
  loading,
  error,
  onAdd,
  onRemove,
  action = "Add",
}: RelationListProps) {
  return (
    <RelationCard title={title} action={action} loading={loading} onAdd={onAdd}>
      <DataTable
        rows={rows}
        columns={[
          {
            key: targetKey,
            header: "Value",
            render: row => labels.get(String(row[targetKey])) ?? String(row[targetKey] ?? "—"),
          },
          {
            key: "actions",
            header: "",
            render: row => (
              <button type="button" onClick={() => onRemove(row)} className="text-xs text-red-300">
                Remove
              </button>
            ),
          },
        ]}
        loading={loading}
        error={error}
        emptyMessage="No relationships."
      />
    </RelationCard>
  );
}

function RelationCard({
  title,
  action,
  loading,
  onAdd,
  children,
}: {
  title: string;
  action: string;
  loading: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-40"
        >
          <Plus size={13} />
          {action}
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
