import { useEffect, useState } from "react";
import { EntityForm } from "../../../shared/components";
import { editorApi } from "../../../shared/api/editorApi";

export function PersonAttributesTab({ personId }: { personId?: number }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    void editorApi.entity.get("person_general_attribute", personId).then(row => {
      setValues(row ? Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)])) : {});
    });
  }, [personId]);

  async function save() {
    if (!personId) return;
    setSaving(true);
    try {
      const payload = {
        person_id: personId,
        current_reputation: values.current_reputation ? Number(values.current_reputation) : null,
        national_reputation: values.national_reputation ? Number(values.national_reputation) : null,
        world_reputation: values.world_reputation ? Number(values.world_reputation) : null,
      };
      const existing = await editorApi.entity.get("person_general_attribute", personId);
      if (existing) await editorApi.entity.update("person_general_attribute", personId, payload);
      else await editorApi.entity.create("person_general_attribute", payload);
      setMessage("Attributes saved.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!personId) return <Empty text="Save the Person first to manage attributes." />;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <EntityForm
        fields={[
          { name: "current_reputation", label: "Current Reputation", type: "number", min: 0 },
          { name: "national_reputation", label: "National Reputation", type: "number", min: 0 },
          { name: "world_reputation", label: "World Reputation", type: "number", min: 0 },
        ]}
        values={values}
        onChange={(name, value) => setValues(current => ({ ...current, [name]: String(value ?? "") }))}
        onSubmit={() => void save()}
        submitLabel="Save Attributes"
        submitting={saving}
      />
      <p className="mt-3 text-xs text-slate-600">Tactical and non-technical Person attribute tables currently have no modeled columns in the World DB.</p>
      {message && <p className="mt-3 text-xs text-slate-400">{message}</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>;
}
