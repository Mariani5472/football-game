import { useState } from "react";
import { Tabs } from "../../../../shared/components";
import type { CompetitionSeason } from "../../types";
import { GeneralTab } from "./GeneralTab";
import { HistoryTab } from "./HistoryTab";
import { SeasonsTab } from "./SeasonsTab";
import { TeamsTab } from "./TeamsTab";
import { StagesTab } from "../stage/StagesTab";

type EditorTab = "general" | "seasons" | "teams" | "stages" | "history";

export function EditorTabs({
  editor,
}: {
  editor: any;
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>("general");
  const season = editor.draft.seasons[0];

  return (
    <Tabs
      activeTab={activeTab}
      onChange={setActiveTab}
      items={[
        { id: "general", label: "General", content: <GeneralTab editor={editor} /> },
        { id: "seasons", label: "Seasons", content: <SeasonsTab seasons={editor.draft.seasons} onChange={editor.updateSeason} /> },
        { id: "teams", label: "Teams", content: <TeamsTab season={season} onChange={editor.updateSeason} /> },
        {
          id: "stages",
          label: "Stages",
          content: (
            <StagesTab
              season={season}
              onChange={editor.updateStage}
              onParticipantRuleChange={editor.updateStageParticipantRule}
              onFormatChange={editor.updateStageFormatRule}
              onPointsChange={editor.updateStagePointsRule}
              onStandingChange={editor.updateStageStandingRules}
            />
          ),
        },
        { id: "history", label: "History", content: <HistoryTab seasons={editor.draft.seasons} /> },
      ]}
    />
  );
}