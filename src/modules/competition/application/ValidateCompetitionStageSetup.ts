import type { CompetitionStageSetup } from "../domain/StageConfigurationRepository.js";

export function validateCompetitionStageSetup(input: CompetitionStageSetup): CompetitionStageSetup {
  const name = input.name.trim();
  if (!name) throw new Error("Stage name is required.");
  if (!Number.isInteger(input.stageOrder) || input.stageOrder <= 0) throw new Error("Stage order must be a positive integer.");
  if (input.stageTypeId !== undefined && (!Number.isInteger(input.stageTypeId) || input.stageTypeId <= 0)) throw new Error("Stage type must be a positive integer ID.");
  if (!Number.isInteger(input.format.legs) || input.format.legs < 1 || input.format.legs > 4) throw new Error("Stage legs must be between 1 and 4.");

  for (const [label, value] of [
    ["participant count", input.format.participantCount],
    ["group count", input.format.groupCount],
    ["participants per group", input.format.participantsPerGroup],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) throw new Error(`${label} must be a positive integer.`);
  }
  if (input.format.type === "GROUP" && (!input.format.groupCount || !input.format.participantsPerGroup)) {
    throw new Error("Group stages require group count and participants per group.");
  }
  if (input.format.groupCount && input.format.participantsPerGroup && input.format.participantCount &&
    input.format.groupCount * input.format.participantsPerGroup > input.format.participantCount) {
    throw new Error("Configured group places cannot exceed participant count.");
  }

  const participantRule = input.participantRule;
  if (participantRule) {
    if (!participantRule.type.trim()) throw new Error("Participant rule type is required.");
    if (participantRule.minimum !== undefined && (!Number.isInteger(participantRule.minimum) || participantRule.minimum < 0)) throw new Error("Minimum participants must be a non-negative integer.");
    if (participantRule.maximum !== undefined && (!Number.isInteger(participantRule.maximum) || participantRule.maximum < 0)) throw new Error("Maximum participants must be a non-negative integer.");
    if (participantRule.minimum !== undefined && participantRule.maximum !== undefined && participantRule.minimum > participantRule.maximum) throw new Error("Minimum participants cannot exceed maximum participants.");
  }

  if (input.schedule?.intervalDays !== undefined && (!Number.isInteger(input.schedule.intervalDays) || input.schedule.intervalDays < 1)) {
    throw new Error("Schedule interval must be a positive integer.");
  }
  if (input.schedule?.startDate && input.schedule.endDate) {
    const start = Date.parse(input.schedule.startDate);
    const end = Date.parse(input.schedule.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Schedule dates must be valid dates.");
    if (start > end) throw new Error("Schedule end date must be on or after the start date.");
  }
  if (input.points && ![input.points.win, input.points.draw, input.points.loss].every(Number.isInteger)) {
    throw new Error("Points must be whole numbers.");
  }
  if ((input.standingRules ?? []).some(rule => !rule.trim())) throw new Error("Standing rule names cannot be empty.");
  if (new Set(input.standingRules ?? []).size !== (input.standingRules ?? []).length) throw new Error("Standing rules cannot contain duplicates.");
  if ((input.matchRules ?? []).some(rule => !rule.type.trim())) throw new Error("Match rule names cannot be empty.");
  if (new Set((input.matchRules ?? []).map(rule => rule.type)).size !== (input.matchRules ?? []).length) {
    throw new Error("Match rule types must be unique.");
  }
  for (const rule of input.qualificationRules ?? []) {
    if (!Number.isInteger(rule.positionFrom) || rule.positionFrom <= 0 ||
      !Number.isInteger(rule.positionTo) || rule.positionTo < rule.positionFrom) {
      throw new Error("Qualification positions must be a valid positive range.");
    }
    if (!rule.destinationCompetitionId && !rule.destinationStageId) {
      throw new Error("Each qualification rule needs a destination competition or stage.");
    }
  }
  return { ...input, name };
}

