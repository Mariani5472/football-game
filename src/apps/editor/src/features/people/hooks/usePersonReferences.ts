import { useEffect, useState } from "react";
import { editorApi } from "../../../shared/api/editorApi";
import type { EntityRow } from "../../../shared/api/editorApi";
import type { PersonReferenceData } from "../types";

const emptyReferences: PersonReferenceData = {
  personTypes: [],
  cities: [],
  nations: [],
  people: [],
  languages: [],
  secondNationalityInfo: [],
  employments: [],
  teams: [],
  relationshipReasons: [],
  nationalTeams: [],
};

async function listAll(table: string): Promise<EntityRow[]> {
  return (await editorApi.entity.list(table, { page: 1, pageSize: 1000 })).rows;
}

export function usePersonReferences() {
  const [data, setData] = useState<PersonReferenceData>(emptyReferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      listAll("person_type"),
      listAll("city"),
      listAll("nation"),
      listAll("person"),
      listAll("language"),
      listAll("second_nationality_info"),
      listAll("employment"),
      listAll("team"),
      listAll("person_person_relationship_reason"),
      listAll("national_team"),
    ])
      .then(([personTypes, cities, nations, people, languages, secondNationalityInfo, employments, teams, relationshipReasons, nationalTeams]) => {
        if (!active) return;
        setData({ personTypes, cities, nations, people, languages, secondNationalityInfo, employments, teams, relationshipReasons, nationalTeams });
        setError(null);
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return { ...data, loading, error };
}
