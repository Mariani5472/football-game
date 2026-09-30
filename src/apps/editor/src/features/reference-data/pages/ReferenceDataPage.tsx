import { useEffect, useMemo, useState } from "react";
import { CrudEntityPage } from "../../../shared/components/crud/CrudEntityPage";
import type { CrudEntityConfig } from "../../../shared/components/crud/CrudEntityPage";
import { editorApi } from "../../../shared/api/editorApi";

const referenceTables = [
  "gender","club_status","club_observation","stadium_owner_type","pitch_type",
  "grass_deterioration_rate","quality_state","environment_quality",
  "competition_stage_type","competition_type","referee_category","trophy",
  "ownership_type","ownership_promise","president_title","patron_type",
  "embargo_type","revenue_type","debt_source","money_direction","payment_interval",
  "clause_condition","person_type","employment","second_nationality_info",
  "position_definition","injury_classification","injury_subclassification",
  "injury_reason","suspension","suspension_type","game_location_type",
  "objective_type","equipment_type","equipment_piece","equipment_style",
  "retired_number_reason","club_affiliation_type","division","transfer_status",
  "transfer_type","contract_type","contract_clause_type","role_duty",
  "tactical_instruction","attribute_scale","press_period","press_type",
  "press_source","award_period","award_recipient_type","award_type",
  "award_voting_type","award_organizer","award_statistic","record_type",
  "weather_season","climate","weekday",
] as const;

type ReferenceTable = (typeof referenceTables)[number];

interface SchemaColumn {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: unknown;
  primaryKey: boolean;
}

interface SchemaForeignKey {
  table: string;
  from: string;
  to: string;
}

interface TableSchema {
  name: string;
  columns: SchemaColumn[];
  primaryKey: string[];
  foreignKeys: SchemaForeignKey[];
}

function titleize(value: string) {
  return value
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fieldType(column: SchemaColumn): "text" | "number" | "boolean" {
  if (/INT|REAL|NUM|DEC|FLOAT|DOUBLE/i.test(column.type)) {
    return /is_|has_|allows_|requires_|enabled|weekend|renewable|fixed_|prevent_|participates_/i.test(column.name)
      ? "boolean"
      : "number";
  }
  return "text";
}

function buildConfig(schema: TableSchema): CrudEntityConfig {
  const fields = schema.columns
    .filter(column => !column.primaryKey)
    .map(column => {
      const foreignKey = schema.foreignKeys.find(fk => fk.from === column.name);
      return {
        name: column.name,
        label: titleize(column.name),
        type: fieldType(column),
        required: column.notNull && column.defaultValue == null,
        relation: foreignKey ? { table: foreignKey.table } : undefined,
      };
    });

  return {
    table: schema.name,
    title: titleize(schema.name),
    description: "Reference data backed directly by world.db.",
    searchColumns: schema.columns
      .filter(column => /TEXT|CHAR|CLOB/i.test(column.type))
      .map(column => column.name),
    columns: schema.columns
      .filter(column => !column.primaryKey)
      .map(column => {
        const foreignKey = schema.foreignKeys.find(fk => fk.from === column.name);
        return {
          key: column.name,
          header: titleize(column.name),
          relation: foreignKey ? { table: foreignKey.table } : undefined,
        };
      }),
    fields,
    pageSize: 20,
  };
}

export function ReferenceDataPage() {
  const [selected, setSelected] = useState<ReferenceTable>("gender");
  const [schemas, setSchemas] = useState<Record<string, TableSchema>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all(
      referenceTables.map(async table => [table, await editorApi.schema(table)] as const),
    )
      .then(results => {
        if (!active) return;
        const next: Record<string, TableSchema> = {};
        for (const [table, schema] of results) next[table] = schema as TableSchema;
        setSchemas(next);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const schema = schemas[selected];
  const config = useMemo(
    () => (schema ? buildConfig(schema) : null),
    [schema],
  );

  const groups = useMemo(() => ({
    Core: referenceTables.slice(0, 8),
    Competitions: referenceTables.slice(8, 12),
    Club: referenceTables.slice(12, 22),
    People: referenceTables.slice(22, 32),
    Gameplay: referenceTables.slice(32, 46),
    Press: referenceTables.slice(46, 49),
    Awards: referenceTables.slice(49, 56),
    Weather: referenceTables.slice(56),
  }), []);

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD DB
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Reference Data
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Generic CRUD for simple world-schema reference tables.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          {Object.entries(groups).map(([group, tables]) => (
            <div key={group}>
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {group}
              </div>
              <div className="space-y-1">
                {tables.map(table => (
                  <button
                    key={table}
                    type="button"
                    onClick={() => setSelected(table as ReferenceTable)}
                    className={[
                      "w-full rounded-lg px-2.5 py-2 text-left text-xs",
                      selected === table
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
                    ].join(" ")}
                  >
                    {titleize(table)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main>
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
              Loading reference schema...
            </div>
          )}
          {!loading && config && <CrudEntityPage config={config} />}
        </main>
      </div>
    </div>
  );
}
