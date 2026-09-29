import { Building2, CircleDollarSign, Users, Trophy, Shield, History, Settings2, Star, MapPin } from "lucide-react";
import { Tabs } from "../../../shared/components";

const tabs = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "identity", label: "Identity", icon: Shield },
  { id: "location", label: "Location", icon: MapPin },
  { id: "stadium", label: "Stadium", icon: Building2 },
  { id: "finances", label: "Finances", icon: CircleDollarSign },
  { id: "affiliations", label: "Affiliations", icon: Users },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "players", label: "Players", icon: Users },
  { id: "staff", label: "Staff", icon: Users },
  { id: "tactics", label: "Tactics", icon: Settings2 },
  { id: "fans", label: "Fans", icon: Star },
  { id: "history", label: "History", icon: History },
] as const;

type ClubTab = (typeof tabs)[number]["id"];

interface ClubEditorProps {
  teamName: string;
  onBack: () => void;
}

export function ClubEditor({
  teamName,
  onBack,
}: ClubEditorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            TEAM / CLUB
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {teamName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Club domain editor. Additional sections can be implemented independently.
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

      <Tabs<ClubTab>
        activeTab="general"
        onChange={() => undefined}
        items={tabs.map((tab) => {
          const Icon = tab.icon;

          return {
            id: tab.id,
            label: tab.label,
            content:
              tab.id === "general" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <SectionCard title="General">
                    <Field label="Status" value="Active" />
                    <Field label="Reputation" value="80" />
                  </SectionCard>

                  <SectionCard title="Quick facts">
                    <Field label="Players" value="—" />
                    <Field label="Competitions" value="—" />
                  </SectionCard>
                </div>
              ) : (
                <SectionCard title={tab.label}>
                  <p className="text-sm text-slate-500">
                    This section is intentionally reserved for the next team-domain increment.
                  </p>
                </SectionCard>
              ),
          };
        })}
      />
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
    </div>
  );
}