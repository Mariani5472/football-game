import { useEffect, useState } from "react";
import type { Person, PersonDraft } from "../types";

const emptyDraft: PersonDraft = {
  firstName: "",
  secondName: "",
  commonName: "",
  fullName: "",
  personTypeId: "",
  sex: "",
  height: "",
  birthDate: "",
  birthCityId: "",
  agentPersonId: "",
  retirementAfterCurrentClub: false,
};

function toDraft(person?: Person | null): PersonDraft {
  return {
    firstName: person?.first_name ?? "",
    secondName: person?.second_name ?? "",
    commonName: person?.common_name ?? "",
    fullName: person?.full_name ?? "",
    personTypeId: person?.person_type_id == null ? "" : String(person.person_type_id),
    sex: person?.sex ?? "",
    height: person?.height == null ? "" : String(person.height),
    birthDate: person?.birth_date ?? "",
    birthCityId: person?.birth_city_id == null ? "" : String(person.birth_city_id),
    agentPersonId: person?.agent_person_id == null ? "" : String(person.agent_person_id),
    retirementAfterCurrentClub: Boolean(person?.retirement_after_current_club),
  };
}

export function usePersonEditor(person?: Person | null) {
  const [draft, setDraft] = useState<PersonDraft>(() => toDraft(person));

  useEffect(() => {
    setDraft(toDraft(person));
  }, [person?.id]);

  function setValue<K extends keyof PersonDraft>(name: K, value: PersonDraft[K]) {
    setDraft(current => ({ ...current, [name]: value }));
  }

  return { draft, setValue };
}
