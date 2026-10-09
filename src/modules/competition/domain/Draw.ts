export interface DrawTeam {
  teamId: number;
  nationId?: number;
  seed?: number;
}

export interface DrawGroup {
  number: number;
  teamIds: number[];
}

export interface DrawRestriction {
  type: "SAME_NATION" | "SAME_GROUP" | "SEEDING";
  sameGroupAllowed: boolean;
}

export interface DrawResult {
  groups: DrawGroup[];
  assignments: Map<number, number>;
}