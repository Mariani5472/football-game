import { useState } from "react";
import { Building2, CircleDollarSign, History, MapPin, Shield, Star, Trophy, Users, WalletCards } from "lucide-react";
import { Tabs } from "../../../shared/components";
import { clubEditorTabs, type ClubEditorTabId } from "../config/clubEditorConfig";
import { ClubEditorTab } from "./ClubEditorTab";
import { useClubEditor } from "../hooks/useClubEditor";

const icons = {
  identity: Shield,
  location: MapPin,
  stadium: Building2,
  ownership: Shield,
  finances: CircleDollarSign,
  staff: Users,
  players: Users,
  affiliations: Users,
  rivals: Shield,
  supporters: Star,
  competitions: Trophy,
  tactics: WalletCards,
  kits: Shield,
  history: History,
  records: Trophy,
} satisfies Record<ClubEditorTabId, typeof Shield>;

export interface ClubEditorProps {
  clubId: number;
  onBack: () => void;
}

export function ClubEditor({ clubId, onBack }: ClubEditorProps) {
  const { team, loading, error } = useClubEditor(clubId);
  const [tab, setTab] = useState<ClubEditorTabId>("identity");
  const name = String(team?.name ?? `Club #${clubId}`);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">Loading club...</div>;
  }

  if (error) {
    return <div className="space-y-4"><div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div><button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">TEAM / CLUB</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">Complete club editor covering identity, location, stadium, ownership, finances, staff, players, affiliations, rivals, supporters, competitions, tactics, kits, history and records.</p>
        </div>
        <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]">Back</button>
      </header>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={clubEditorTabs.map(item => {
          const Icon = icons[item.id];
          return {
            id: item.id,
            label: item.label,
            icon: Icon,
            content: <ClubEditorTab clubId={clubId} tab={item} />,
          };
        })}
      />
    </div>
  );
}

