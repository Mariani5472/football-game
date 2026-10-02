import { useState } from "react";
import {
  ArrowRightLeft,
  Banknote,
  CloudSun,
  History,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { TransfersPage } from "./TransfersPage";
import { FinancePage } from "./FinancePage";
import { HistoryPage } from "./HistoryPage";
import { MediaPage } from "./MediaPage";
import { WeatherPage } from "./WeatherPage";
import { NationalityPage } from "./NationalityPage";

type WorldSystemTab = "transfers" | "finance" | "history" | "media" | "weather" | "nationality";

const tabs = [
  { id: "transfers" as const, label: "Transfers & Contracts", icon: ArrowRightLeft },
  { id: "finance" as const, label: "Club Finance", icon: Banknote },
  { id: "history" as const, label: "History & Awards", icon: History },
  { id: "media" as const, label: "Press & Media", icon: Newspaper },
  { id: "weather" as const, label: "Weather & Climate", icon: CloudSun },
  { id: "nationality" as const, label: "Nationality", icon: ShieldCheck },
];

export function WorldSystemsPage() {
  const [tab, setTab] = useState<WorldSystemTab>("transfers");
  const active = tabs.find(item => item.id === tab)!;

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD SYSTEMS
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{active.label}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Configure the systems that define the football world: player movement, club finances,
          historical records, media coverage, climate and nationality rules.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
        {tabs.map(item => {
          const Icon = item.icon;
          const selected = item.id === tab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition",
                selected
                  ? "bg-emerald-400/10 text-emerald-200"
                  : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200",
              ].join(" ")}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "transfers" && <TransfersPage />}
      {tab === "finance" && <FinancePage />}
      {tab === "history" && <HistoryPage />}
      {tab === "media" && <MediaPage />}
      {tab === "weather" && <WeatherPage />}
      {tab === "nationality" && <NationalityPage />}
    </div>
  );
}
