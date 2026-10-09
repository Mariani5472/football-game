import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import type { PersonDraft } from "../types";

function nullableText(value: string): Scalar { return value.trim() || null; }
function nullableNumber(value: string): Scalar {
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Numeric fields must contain valid numbers.");
  return parsed;
}

export function usePersonPersistence() {
  async function savePerson(personId: number | undefined, draft: PersonDraft): Promise<EntityRow> {
    if (!draft.fullName.trim()) throw new Error("Full Name is required.");
    if (!draft.personTypeId) throw new Error("Person Type is required.");
    return personId
      ? editorApi.entity.update("person", personId, {
          first_name: nullableText(draft.firstName),
          second_name: nullableText(draft.secondName),
          common_name: nullableText(draft.commonName),
          full_name: draft.fullName.trim(),
          person_type_id: Number(draft.personTypeId),
          sex: nullableText(draft.sex),
          height: nullableNumber(draft.height),
          birth_date: nullableText(draft.birthDate),
          birth_city_id: draft.birthCityId ? Number(draft.birthCityId) : null,
          agent_person_id: draft.agentPersonId ? Number(draft.agentPersonId) : null,
          retirement_after_current_club: draft.retirementAfterCurrentClub,
        })
      : editorApi.entity.create("person", {
          first_name: nullableText(draft.firstName),
          second_name: nullableText(draft.secondName),
          common_name: nullableText(draft.commonName),
          full_name: draft.fullName.trim(),
          person_type_id: Number(draft.personTypeId),
          sex: nullableText(draft.sex),
          height: nullableNumber(draft.height),
          birth_date: nullableText(draft.birthDate),
          birth_city_id: draft.birthCityId ? Number(draft.birthCityId) : null,
          agent_person_id: draft.agentPersonId ? Number(draft.agentPersonId) : null,
          retirement_after_current_club: draft.retirementAfterCurrentClub,
        });
  }

  async function syncLanguages(personId: number, selectedLanguageIds: number[]) {
    const result = await editorApi.entity.list("person_language", { page: 1, pageSize: 1000 });
    const existing = result.rows.filter(row => Number(row.person_id) === personId);
    const target = new Set(selectedLanguageIds);
    for (const row of existing) {
      if (!target.has(Number(row.language_id))) {
        await editorApi.entity.remove("person_language", JSON.stringify({ person_id: personId, language_id: Number(row.language_id) }));
      }
    }
    for (const languageId of selectedLanguageIds) {
      if (!existing.some(row => Number(row.language_id) === languageId)) {
        await editorApi.entity.create("person_language", { person_id: personId, language_id: languageId });
      }
    }
  }

  async function upsertSingle(table: string, personId: number, values: Record<string, Scalar>) {
    const existing = await editorApi.entity.get(table, personId);
    return existing
      ? editorApi.entity.update(table, personId, values)
      : editorApi.entity.create(table, { person_id: personId, ...values });
  }

  return {
    savePerson, syncLanguages,
    saveInternational: (personId: number, values: Record<string, Scalar>) => upsertSingle("person_international_data", personId, values),
    saveGeneralAttributes: (personId: number, values: Record<string, Scalar>) => upsertSingle("person_general_attribute", personId, values),
  };
}
