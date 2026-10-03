import { useEffect, useMemo, useState } from "react";
import { entityApi } from "../../../shared/api/entityApi";
import { referenceTables, type ReferenceTable } from "../config/referenceTables";
import { buildReferenceConfig, type TableSchema } from "../config/referenceConfig";

export function useReferenceData() {
  const [selected, setSelected] = useState<ReferenceTable>("gender");
  const [schemas, setSchemas] = useState<Record<string, TableSchema>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all(
      referenceTables.map(async table => [table, await entityApi.schema(table)] as const),
    )
      .then(results => {
        if (!active) return;
        setSchemas(Object.fromEntries(results) as Record<string, TableSchema>);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const schema = schemas[selected];
  const config = useMemo(
    () => (schema ? buildReferenceConfig(schema) : null),
    [schema],
  );

  return { selected, setSelected, config, loading, error };
}
