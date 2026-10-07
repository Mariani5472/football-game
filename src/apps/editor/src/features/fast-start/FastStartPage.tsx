import { useEffect, useMemo, useState } from "react";
import { editorApi } from "../../shared/api/editorApi";
import type { FastStartResult, FastStartScenario } from "../../shared/api/types";
import { FastStartProgress } from "./FastStartProgress";
import { FastStartSummary } from "./FastStartSummary";

export function FastStartPage() {
  const [scenarios, setScenarios] = useState<FastStartScenario[]>([]);
  const [template, setTemplate] = useState<"EMPTY" | "SANDBOX" | "BRAZIL">("SANDBOX");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<FastStartResult | null>(null);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void editorApi.world.fastStartScenarios()
      .then(items => {
        if (cancelled) return;
        setScenarios(items);
        if (!items.some(item => item.id === template) && items[0]) {
          setTemplate(items[0].id);
        }
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoadingScenarios(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenario = useMemo(
    () => scenarios.find(scenario => scenario.id === template),
    [scenarios, template],
  );

  async function generate() {
    if (!Number.isInteger(seasonYear)) return;
    if (!window.confirm("Fast Start will generate a complete starter World and validate it before reporting success. Continue?")) return;

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const generated = await editorApi.world.fastStart({
        template,
        seasonYear,
      });
      setResult(generated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const stepKeys = [
    "SCENARIO",
    "WORLD",
    "CLUBS",
    "PEOPLE",
    "PLAYERS",
    "STADIUMS",
    "COMPETITIONS",
    "CALENDAR",
    "VALIDATION",
  ];

  const doneSteps = new Set(result?.steps ?? []);
  const progress = stepKeys.map(key => ({
    key,
    label: {
      SCENARIO: "Choose scenario",
      WORLD: "Generate World",
      CLUBS: "Generate clubs",
      PEOPLE: "Generate people",
      PLAYERS: "Generate players",
      STADIUMS: "Generate stadiums",
      COMPETITIONS: "Generate competitions",
      CALENDAR: "Generate calendar",
      VALIDATION: "Validate",
    }[key] ?? key,
    status: doneSteps.has(key) ? "DONE" : "PENDING",
  } as const));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD SETUP</div>
        <h1 className="text-2xl font-semibold text-white">Fast Start</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Select a scenario and build a playable World using the same generators and domain use cases used elsewhere in the editor.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block space-y-2 text-sm text-slate-300">
          Scenario
          <select
            value={template}
            disabled={loadingScenarios || busy}
            onChange={event => setTemplate(event.target.value as typeof template)}
            className="block w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-slate-100"
          >
            {scenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label} · {scenario.teamCount} teams
              </option>
            ))}
          </select>
        </label>

        {selectedScenario && (
          <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
            <div className="font-medium text-white">{selectedScenario.label}</div>
            <div className="mt-1 text-xs text-slate-500">
              The scenario decides the shared generator configuration. Fast Start does not maintain a second set of generation rules.
            </div>
          </div>
        )}

        <label className="block space-y-2 text-sm text-slate-300">
          Season year
          <input
            type="number"
            min={1900}
            max={3000}
            value={seasonYear}
            disabled={busy}
            onChange={event => setSeasonYear(Number(event.target.value))}
            className="block w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-slate-100"
          />
        </label>

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Pipeline</div>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Scenario → World → Clubs → People → Players → Stadiums → Competitions → Calendar → Validation
          </p>
          <div className="mt-4">
            <FastStartProgress steps={progress} />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</p>
        )}

        <button
          type="button"
          disabled={busy || loadingScenarios || !Number.isInteger(seasonYear)}
          onClick={() => void generate()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate Playable World"}
        </button>
      </section>

      {result && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div>
            <div className="text-sm font-semibold text-emerald-300">World ready</div>
            <p className="mt-1 text-sm text-slate-400">
              {result.scenario} scenario generated for season {result.seasonYear}.
            </p>
          </div>
          <FastStartSummary summary={result.summary} />
        </section>
      )}
    </div>
  );
}
