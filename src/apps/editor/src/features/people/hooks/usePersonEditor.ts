import { useState } from "react";

import type { Person, PersonDraft } from "../types";

const emptyDraft: PersonDraft = {
  fullName: "",
  commonName: "",
  birthDate: "",
  birthCityId: "",
  nationalityId: "",
  languageIds: [],
};

export function usePersonEditor(person?: Person) {
  const [draft, setDraft] = useState<PersonDraft>(
    person
      ? {
          fullName: person.fullName,
          commonName: person.commonName ?? "",
          birthDate: person.birthDate ?? "",
          birthCityId: person.birthCityId?.toString() ?? "",
          nationalityId: person.nationalityId?.toString() ?? "",
          languageIds: person.languageIds,
        }
      : emptyDraft,
  );

  function setValue(
    name: keyof Omit<PersonDraft, "languageIds">,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function toggleLanguage(languageId: number) {
    setDraft((current) => ({
      ...current,
      languageIds: current.languageIds.includes(languageId)
        ? current.languageIds.filter((id) => id !== languageId)
        : [...current.languageIds, languageId],
    }));
  }

  return { draft, setValue, toggleLanguage };
}
