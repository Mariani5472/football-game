import type { Duty, Formation, Role, RoleKeyAttribute, TacticalPosition } from "../types";

export const tacticalPositions: TacticalPosition[] = [
  { id: 1, name: "Goalkeeper", shortName: "GK" },
  { id: 2, name: "Centre Back", shortName: "CB" },
  { id: 3, name: "Full Back", shortName: "FB" },
  { id: 4, name: "Defensive Midfielder", shortName: "DM" },
  { id: 5, name: "Central Midfielder", shortName: "CM" },
  { id: 6, name: "Attacking Midfielder", shortName: "AM" },
  { id: 7, name: "Winger", shortName: "W" },
  { id: 8, name: "Striker", shortName: "ST" },
];

export const duties: Duty[] = [
  { id: 1, name: "Defend" },
  { id: 2, name: "Support" },
  { id: 3, name: "Attack" },
];

const keyAttributes = (...entries: Array<[number, number]>): RoleKeyAttribute[] =>
  entries.map(([attributeId, weight]) => ({ attributeId, weight }));

export const roles: Role[] = [
  {
    id: 1,
    positionId: 1,
    name: "Goalkeeper",
    description: "Protects the goal and starts play from the back.",
    dutyIds: [1, 2],
  },
  {
    id: 2,
    positionId: 1,
    name: "Sweeper Keeper",
    description: "Defends space behind the defensive line and participates in build-up.",
    dutyIds: [1, 2],
  },
  {
    id: 3,
    positionId: 3,
    name: "Full Back",
    description: "Defends the flank and supports the team in possession.",
    dutyIds: [1, 2],
  },
  {
    id: 4,
    positionId: 3,
    name: "Wing Back",
    description: "Provides width and advances aggressively from the full-back line.",
    dutyIds: [2, 3],
  },
  {
    id: 5,
    positionId: 2,
    name: "Central Defender",
    description: "Protects the centre of the defensive line and wins defensive duels.",
    dutyIds: [1, 2],
  },
  {
    id: 6,
    positionId: 2,
    name: "Ball Playing Defender",
    description: "Combines defensive responsibility with progressive distribution.",
    dutyIds: [1, 2],
  },
  {
    id: 7,
    positionId: 4,
    name: "Defensive Midfielder",
    description: "Shields the defence and keeps the midfield structure balanced.",
    dutyIds: [1, 2],
  },
  {
    id: 8,
    positionId: 4,
    name: "Deep Lying Playmaker",
    description: "Provides a deep passing outlet while protecting the centre.",
    dutyIds: [1, 2],
  },
  {
    id: 9,
    positionId: 5,
    name: "Central Midfielder",
    description: "Connects defensive and attacking phases from central areas.",
    dutyIds: [1, 2, 3],
  },
  {
    id: 10,
    positionId: 5,
    name: "Box to Box",
    description: "Covers ground between both boxes and contributes in both phases.",
    dutyIds: [2, 3],
  },
  {
    id: 11,
    positionId: 5,
    name: "Playmaker",
    description: "Takes responsibility for progressing and creating possession.",
    dutyIds: [2, 3],
  },
  {
    id: 12,
    positionId: 7,
    name: "Winger",
    description: "Holds width and attacks from the flank.",
    dutyIds: [2, 3],
  },
  {
    id: 13,
    positionId: 7,
    name: "Inside Forward",
    description: "Starts wide and attacks central spaces.",
    dutyIds: [2, 3],
  },
  {
    id: 14,
    positionId: 8,
    name: "Advanced Forward",
    description: "Leads the line and attacks space behind the defence.",
    dutyIds: [2, 3],
  },
  {
    id: 15,
    positionId: 8,
    name: "Target Forward",
    description: "Provides a focal point for direct play and brings teammates into attacks.",
    dutyIds: [2, 3],
  },
  {
    id: 16,
    positionId: 8,
    name: "False 9",
    description: "Drops into midfield to connect play and create space ahead.",
    dutyIds: [2, 3],
  },
];

export const formations: Formation[] = [
  {
    id: 1,
    name: "4-3-3",
    description: "Four defenders, a single defensive midfielder, two central midfielders and a front three.",
    positions: [
      { id: 1, positionId: 1, label: "GK", side: "center", x: 50, y: 90, roleId: 1, dutyId: 1 },
      { id: 2, positionId: 3, label: "RB", side: "right", x: 82, y: 72, roleId: 3, dutyId: 2 },
      { id: 3, positionId: 2, label: "CB", side: "right", x: 62, y: 72, roleId: 5, dutyId: 1 },
      { id: 4, positionId: 2, label: "CB", side: "left", x: 38, y: 72, roleId: 6, dutyId: 1 },
      { id: 5, positionId: 3, label: "LB", side: "left", x: 18, y: 72, roleId: 3, dutyId: 2 },
      { id: 6, positionId: 4, label: "DM", side: "center", x: 50, y: 55, roleId: 8, dutyId: 1 },
      { id: 7, positionId: 5, label: "CM", side: "right", x: 66, y: 43, roleId: 10, dutyId: 2 },
      { id: 8, positionId: 5, label: "CM", side: "left", x: 34, y: 43, roleId: 11, dutyId: 2 },
      { id: 9, positionId: 7, label: "RW", side: "right", x: 82, y: 22, roleId: 12, dutyId: 3 },
      { id: 10, positionId: 8, label: "ST", side: "center", x: 50, y: 18, roleId: 14, dutyId: 3 },
      { id: 11, positionId: 7, label: "LW", side: "left", x: 18, y: 22, roleId: 12, dutyId: 3 },
    ],
  },
];

export function getPosition(positionId: number) {
  return tacticalPositions.find((position) => position.id === positionId);
}

export function getRole(roleId: number) {
  return roles.find((role) => role.id === roleId);
}

export function getDuty(dutyId: number) {
  return duties.find((duty) => duty.id === dutyId);
}
