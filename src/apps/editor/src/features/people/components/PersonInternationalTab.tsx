import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { EntityForm } from "../../../shared/components";

export function PersonInternationalTab({ personId }: { personId?: number }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    void editorApi.entity.get("person_international_data", personId).then(row => {
      setValues(row ? Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)])) : {});
    });
  }, [personId]);

  async function save() {
    if (!personId) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string | number | null> = {
        person_id: personId,
        caps: values.caps ? Number(values.caps) : null,
        goals: values.goals ? Number(values.goals) : null,
        under_21_caps: values.under_21_caps ? Number(values.under_21_caps) : null,
        under_21_goals: values.under_21_goals ? Number(values.under_21_goals) : null,
        debut_date: values.debut_date || null,
        debut_opponent_nation_id: values.debut_opponent_nation_id ? Number(values.debut_opponent_nation_id) : null,
        first_goal_date: values.first_goal_date || null,
        first_goal_opponent_nation_id: values.first_goal_opponent_nation_id ? Number(values.first_goal_opponent_nation_id) : null,
        current_national_team_id: values.current_national_team_id ? Number(values.current_national_team_id) : null,
        youth_national_team_id: values.youth_national_team_id ? Number(values.youth_national_team_id) : null,
      };
      const existing = await editorApi.entity.get("person_international_data", personId);
      if (existing) await editorApi.entity.update("person_international_data", personId, payload);
      else await editorApi.entity.create("person_international_data", payload);
      setMessage("International data saved.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!personId) return <Empty text="Save the Person first to manage international data." />;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <EntityForm
        fields={[
          { name: "caps", label: "Senior Caps", type: "number", min: 0 },
          { name: "goals", label: "Senior Goals", type: "number", min: 0 },
          { name: "under_21_caps", label: "U21 Caps", type: "number", min: 0 },
          { name: "under_21_goals", label: "U21 Goals", type: "number", min: 0 },
          { name: "debut_date", label: "Debut Date", type: "date" },
          { name: "first_goal_date", label: "First Goal Date", type: "date" },
        ]}
        values={values}
        onChange={(name, value) => setValues(current => ({ ...current, [name]: String(value ?? "") }))}
        onSubmit={() => void save()}
        submitLabel="Save International Data"
        submitting={saving}
      />
      {message && <p className="mt-3 text-xs text-slate-400">{message}</p>}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-600">{text}</div>;
}
