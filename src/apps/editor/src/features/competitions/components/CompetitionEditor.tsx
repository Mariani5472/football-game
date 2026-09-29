import { ArrowLeft } from "lucide-react";

import { useCompetitionEditor } from "../hooks/useCompetitionEditor";
import { EditorTabs } from "./editor/EditorTabs";
import type { Competition } from "../types";

interface CompetitionEditorProps {
  competition?: Competition;
  onBack: () => void;
}

export function CompetitionEditor({
  competition,
  onBack,
}: CompetitionEditorProps) {
  const editor = useCompetitionEditor(competition);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            COMPETITIONS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {editor.draft.name || "New Competition"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Define the competition, seasons, participants and competition rules.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </header>

      <EditorTabs editor={editor} />
    </div>
  );
}
