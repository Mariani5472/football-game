import { useState } from "react";
import { CrudEntityPage, Tabs, type CrudEntityConfig } from "../../../shared/components";
import {
  teamConfig,
  clubConfig,
  nationalTeamConfig,
  nationalTeamInfoConfig,
  nationalTeamCoefficientConfig,
  ownershipConfig,
  reserveTeamConfig,
  financeConfig,
  embargoConfig,
  revenueConfig,
  debtConfig,
  ffpConfig,
  fanProfileConfig,
  objectivesConfig,
  equipmentConfig,
  teamPersonConfig,
  captainConfig,
  partnershipConfig,
  retiredNumberConfig,
  affiliationConfig,
  rivalryConfig,
  derbyConfig,
  competitionHistoryConfig,
  regionalCompetitionConfig,
  expectationConfig,
  coefficientConfig,
} from "../config/teamConfig";

type ConfigItem = {
  id: string;
  label: string;
  config: CrudEntityConfig;
};

const sections: Record<string, ConfigItem[]> = {
  identity: [
    { id: "team", label: "Team", config: teamConfig },
    { id: "club", label: "Club", config: clubConfig },
    { id: "national-team", label: "National Team", config: nationalTeamConfig },
    { id: "national-info", label: "National Team Info", config: nationalTeamInfoConfig },
    { id: "national-coefficients", label: "National Coefficients", config: nationalTeamCoefficientConfig },
  ],
  club: [
    { id: "ownership", label: "Ownership", config: ownershipConfig },
    { id: "reserve", label: "Reserve Teams", config: reserveTeamConfig },
    { id: "finance", label: "Finance", config: financeConfig },
    { id: "embargo", label: "Embargoes", config: embargoConfig },
    { id: "revenue", label: "Revenue", config: revenueConfig },
    { id: "debt", label: "Debt", config: debtConfig },
    { id: "ffp", label: "FFP", config: ffpConfig },
    { id: "fans", label: "Fan Profile", config: fanProfileConfig },
    { id: "objectives", label: "Objectives", config: objectivesConfig },
  ],
  relations: [
    { id: "equipment", label: "Equipment", config: equipmentConfig },
    { id: "people", label: "Team ↔ Person", config: teamPersonConfig },
    { id: "captains", label: "Captain", config: captainConfig },
    { id: "partnerships", label: "Partnerships", config: partnershipConfig },
    { id: "retired-numbers", label: "Retired Numbers", config: retiredNumberConfig },
    { id: "rivalries", label: "Rivalries", config: rivalryConfig },
    { id: "derbies", label: "Derbies", config: derbyConfig },
    { id: "affiliations", label: "Affiliations", config: affiliationConfig },
  ],
  history: [
    { id: "competition-history", label: "Competition History", config: competitionHistoryConfig },
    { id: "regional-competition", label: "Regional Competitions", config: regionalCompetitionConfig },
    { id: "expectations", label: "Expectations", config: expectationConfig },
    { id: "coefficients", label: "Coefficients", config: coefficientConfig },
  ],
};

export function TeamsPage() {
  const [section, setSection] = useState("identity");

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD DB
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Teams & Clubs
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Complete editor for team identity, club data, national-team data,
          finance, ownership, relationships and competition history.
        </p>
      </header>

      <Tabs
        activeTab={section}
        onChange={setSection}
        items={[
          {
            id: "identity",
            label: "Identity",
            content: <ConfigGroup items={sections.identity} />,
          },
          {
            id: "club",
            label: "Club",
            content: <ConfigGroup items={sections.club} />,
          },
          {
            id: "relations",
            label: "Relations",
            content: <ConfigGroup items={sections.relations} />,
          },
          {
            id: "history",
            label: "History",
            content: <ConfigGroup items={sections.history} />,
          },
        ]}
      />
    </div>
  );
}

function ConfigGroup({ items }: { items: ConfigItem[] }) {
  const [activeTab, setActiveTab] = useState(items[0]?.id ?? "");

  return (
    <Tabs
      activeTab={activeTab}
      onChange={setActiveTab}
      items={items.map(item => ({
        id: item.id,
        label: item.label,
        content: <CrudEntityPage config={item.config} />,
      }))}
    />
  );
}
