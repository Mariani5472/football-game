import type { CompetitionSeason } from "../../types";

export function SeasonsTab({
  seasons,
  onChange,
}: {
  seasons: CompetitionSeason[];
  onChange: (id: number, patch: Partial<CompetitionSeason>) => void;
}) {
  return (
    <div className="space-y-3">
      {seasons.map((season) => (
        <div key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr_160px]">
            <Field
              label="Year"
              value={String(season.year)}
              onChange={(value) => onChange(season.id, { year: Number(value) || season.year })}
            />
            <Field label="Start" value={season.startDate} onChange={(value) => onChange(season.id, { startDate: value })} />
            <Field label="End" value={season.endDate} onChange={(value) => onChange(season.id, { endDate: value })} />
            <label className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">Status</span>
              <select
                value={season.status}
                onChange={(event) => onChange(season.id, { status: event.target.value as CompetitionSeason["status"] })}
                className="w-full rounded-xl border border-white/10 bg-[#121820] px-3 py-2.5 text-sm text-slate-300 outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-400">{label}</span>
      <input value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" />
    </label>
  );
}