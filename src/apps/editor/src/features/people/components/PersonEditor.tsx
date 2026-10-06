import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Tabs } from "../../../shared/components";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { usePersonEditor } from "../hooks/usePersonEditor";
import { usePersonPersistence } from "../hooks/usePersonPersistence";
import { usePersonReferences } from "../hooks/usePersonReferences";
import { PersonIdentityTab } from "./PersonIdentityTab";
import { PersonNationalityTab } from "./PersonNationalityTab";
import { PersonLanguagesTab } from "./PersonLanguagesTab";
import { PersonContractTab } from "./PersonContractTab";
import { PersonRelationshipsTab } from "./PersonRelationshipsTab";
import { PersonInternationalTab } from "./PersonInternationalTab";
import { PersonAttributesTab } from "./PersonAttributesTab";
import { PersonTrendsTab } from "./PersonTrendsTab";
import { PersonHistoryTab } from "./PersonHistoryTab";
import type { Person } from "../types";

export function PersonEditor({
  personId,
  onBack,
  onSaved,
}: {
  personId?: number;
  onBack: () => void;
  onSaved: (id: number) => void;
}) {
  const references = usePersonReferences();
  const persistence = usePersonPersistence();
  const [person, setPerson] = useState<Person | null>(null);
  const [tab, setTab] = useState("identity");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editor = usePersonEditor(person);

  useEffect(() => {
    if (!personId) {
      setPerson(null);
      return;
    }
    let active = true;
    void editorApi.entity.get<Person>("person", personId)
      .then(row => active && setPerson(row))
      .catch(cause => active && setError(cause instanceof Error ? cause.message : String(cause)));
    return () => { active = false; };
  }, [personId]);

  async function saveIdentity() {
    setSaving(true);
    setError(null);
    try {
      const result = await persistence.savePerson(personId, editor.draft);
      const id = Number(result.id);
      setPerson(result as Person);
      onSaved(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const title = person?.full_name ?? (personId ? `Person #${personId}` : "New Person");
  const locked = !personId;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600"><UserRound size={14} /> PEOPLE / PERSON</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Complete Person editor: identity, nationality, languages, contracts, relationships, international data, attributes, trends and history.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button>
      </header>

      {(error || references.error) && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error ?? references.error}</div>}

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          { id: "identity", label: "Identity", content: <PersonIdentityTab draft={editor.draft} references={references} onChange={editor.setValue} saving={saving} onSave={() => void saveIdentity()} /> },
          { id: "nationality", label: "Nationality", content: <PersonNationalityTab personId={personId} references={references} /> },
          { id: "languages", label: "Languages", content: <PersonLanguagesTab personId={personId} references={references} /> },
          { id: "contracts", label: "Contracts", content: <PersonContractTab personId={personId} references={references} /> },
          { id: "relationships", label: "Relationships", content: <PersonRelationshipsTab personId={personId} references={references} /> },
          { id: "international", label: "International", content: <PersonInternationalTab personId={personId} /> },
          { id: "attributes", label: "Attributes", content: <PersonAttributesTab personId={personId} /> },
          { id: "trends", label: "Trends", content: <PersonTrendsTab personId={personId} /> },
          { id: "history", label: "History & Clubs", content: <PersonHistoryTab personId={personId} teams={references.teams} /> },
        ]}
      />

      {locked && <p className="text-right text-xs text-slate-600">Save the Person from the Identity tab to unlock relationship data.</p>}
    </div>
  );
}
