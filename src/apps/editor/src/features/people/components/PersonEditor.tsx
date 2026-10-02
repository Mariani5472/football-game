import { UserRound } from "lucide-react";

import { cities, countries, languages } from "../../world/data/world.data";
import { EntityForm, EntityPicker } from "../../../shared/components";
import { usePersonEditor } from "../hooks/usePersonEditor";
import type { Person } from "../types";

interface PersonEditorProps {
  person?: Person;
  onBack: () => void;
}

export function PersonEditor({ person, onBack }: PersonEditorProps) {
  const editor = usePersonEditor(person);

  const fields = [
    { name: "fullName", label: "Full Name", required: true },
    { name: "commonName", label: "Common Name" },
    {
      name: "birthDate",
      label: "Birth Date",
      placeholder: "YYYY-MM-DD",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            <UserRound size={14} />
            PEOPLE / PERSON
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {person?.fullName ?? "New Person"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Identity, birth data, nationality and languages belong to Person.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          Back
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <EntityForm
          fields={fields}
          values={{
            fullName: editor.draft.fullName,
            commonName: editor.draft.commonName,
            birthDate: editor.draft.birthDate,
          }}
          onChange={(name, value) => {
            if (name === "fullName" || name === "commonName" || name === "birthDate") {
              editor.setValue(name, String(value));
            }
          }}
          onSubmit={() => undefined}
          submitLabel={person ? "Save Person" : "Create Person"}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <EntityPicker
              label="Birth City"
              value={editor.draft.birthCityId}
              options={cities.map((city) => ({ id: city.id, label: city.name }))}
              onChange={(value) => editor.setValue("birthCityId", String(value))}
            />
            <EntityPicker
              label="Nationality"
              value={editor.draft.nationalityId}
              options={countries.map((country) => ({ id: country.id, label: country.name }))}
              onChange={(value) => editor.setValue("nationalityId", String(value))}
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 text-xs font-medium text-slate-400">Languages</div>
            <div className="grid gap-2 md:grid-cols-2">
              {languages.map((language) => {
                const selected = editor.draft.languageIds.includes(language.id);
                return (
                  <label
                    key={language.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => editor.toggleLanguage(language.id)}
                    />
                    {language.name}
                  </label>
                );
              })}
            </div>
          </div>
        </EntityForm>
      </div>
    </div>
  );
}
