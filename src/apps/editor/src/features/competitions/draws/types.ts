export type DrawType = "RANDOM" | "SEEDED" | "CONDITIONAL";

export type DrawRestrictionType =
  | "SAME_NATION"
  | "SAME_GROUP"
  | "SEEDING";

export interface DrawDefinition {
  id: number;
  stageId: number;
  name: string;
  drawType: DrawType;
  groupCount: number;
  teamsPerGroup: number;
  seedCount: number;
  orderMode: "RANDOM" | "SEEDED";
}

export interface DrawPot {
  id: number;
  drawId: number;
  name: string;
  potOrder: number;
  teamIds: number[];
}

export interface DrawRestriction {
  id: number;
  drawId: number;
  type: DrawRestrictionType;
  sourcePotId?: number;
  targetPotId?: number;
  maxMeetings?: number;
  sameGroupAllowed: boolean;
  nationIds?: number[];
  continentIds?: number[];
  competitionIds?: number[];
}

export interface DrawTeam {
  teamId: number;
  nationId?: number;
  seed?: number;
}

export interface DrawGroup {
  number: number;
  teamIds: number[];
}

export interface DrawResult {
  groups: DrawGroup[];
  assignments: Map<number, number>;
}
