import { useState } from "react";
import { editorApi } from "../../shared/api/editorApi";

export function FastStartPage() {
  const [template, setTemplate] = useState<"SANDBOX" | "BRAZIL">("SANDBOX");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!window.confirm("Fast Start adds generated geography, clubs, people, players, stadiums and competitions to the current World. Continue?")) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await editorApi.world.fastStart({ template, seasonYear });
      setMessage(`${result.template} World generated for ${result.seasonYear}. Run Validation to review the result.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD SETUP</div>
        <h1 className="text-2xl font-semibold text-white">Fast Start</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Generate a starter scenario with geography, clubs, players, stadiums and a competition. Generated data is added to the open World.</p>
      </header>
      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block space-y-2 text-sm text-slate-300">Scenario
          <select value={template} onChange={event => setTemplate(event.target.value as "SANDBOX" | "BRAZIL")} className="block w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2">
            <option value="SANDBOX">Sandbox · 8 teams</option>
            <option value="BRAZIL">Brazil Sandbox · 20 teams</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm text-slate-300">Season year
          <input type="number" min={1900} max={3000} value={seasonYear} onChange={event => setSeasonYear(Number(event.target.value))} className="block w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2" />
        </label>
        <p className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">Fast Start adds records to this World and does not clear existing data. If unique records conflict, the transaction rolls back.</p>
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="button" disabled={busy || !Number.isInteger(seasonYear)} onClick={() => void generate()} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">{busy ? "Generating…" : "Generate World"}</button>
      </section>
    </div>
  );
}
