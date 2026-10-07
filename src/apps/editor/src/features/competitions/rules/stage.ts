import type { CompetitionStage, StandingRuleType } from "../types";
import { validateSimpleLeague } from "./league";

export interface StageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const SUPPORTED_TIEBREAKS: StandingRuleType[] = [
  "POINTS",
  "GOAL_DIFFERENCE",
  "GOALS_FOR",
  "WINS",
];

export function validateCompetitionStage(stage: CompetitionStage): StageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isInteger(stage.participantRule.minParticipants) || stage.participantRule.minParticipants < 1) {
    errors.push("Minimum participants must be a positive integer.");
  }

  if (!Number.isInteger(stage.participantRule.maxParticipants) || stage.participantRule.maxParticipants < stage.participantRule.minParticipants) {
    errors.push("Maximum participants must be greater than or equal to minimum participants.");
  }

  if (stage.participants.length < stage.participantRule.minParticipants) {
    errors.push("The stage does not have the minimum number of participants.");
  }

  if (stage.participants.length > stage.participantRule.maxParticipants) {
    errors.push("The stage exceeds the configured maximum number of participants.");
  }

  const format = stage.formatRule;
  if (format.participantCount !== stage.participants.length && stage.format === "KNOCKOUT") {
    warnings.push("Knockout participant count differs from the current direct participant list; a source/draw may populate it at runtime.");
  }

  if (format.legs < 1 || format.legs > 4) errors.push("Legs must be between 1 and 4.");
  if (format.homeAway === 1 && format.legs < 2 && format.formatType === "LEAGUE") {
    errors.push("League home-and-away requires at least 2 legs.");
  }

  if (format.formatType === "GROUP") {
    if (!format.groupCount || !format.participantsPerGroup) {
      errors.push("Group stages require group count and participants per group.");
    } else if (format.groupCount * format.participantsPerGroup !== stage.participants.length) {
      errors.push("Group count × teams per group must match the stage participant count.");
    }
  }

  if (format.formatType === "KNOCKOUT") {
    if (format.participantsPerGroup && format.groupCount) {
      warnings.push("Group settings are ignored by knockout stages.");
    }
  }

  const duplicatedRules = stage.standingRules.filter((rule, index, rules) =>
    rules.findIndex(candidate => candidate.ruleType === rule.ruleType) !== index,
  );
  if (duplicatedRules.length) errors.push("Standing rules cannot contain duplicates.");

  for (const rule of stage.standingRules) {
    if (!SUPPORTED_TIEBREAKS.includes(rule.ruleType)) {
      warnings.push(`Standing rule "${rule.ruleType}" is not implemented by the current engine.`);
    }
  }

  if (stage.format === "LEAGUE") {
    const league = validateSimpleLeague(stage);
    errors.push(...league.errors);
  }

  if (stage.draw.drawType !== "NONE") {
    if (stage.draw.groupCount < 1 || stage.draw.teamsPerGroup < 1) {
      errors.push("Draw group configuration must be positive.");
    }
    if (stage.draw.groupCount * stage.draw.teamsPerGroup !== stage.participants.length) {
      errors.push("Draw group count × teams per group must match stage participants.");
    }
  }

  for (const source of stage.participantSources) {
    if (source.sourceType !== "DIRECT" && !source.sourceStageId && !source.sourceCompetitionId) {
      errors.push(`Participant source "${source.sourceType}" needs a source competition or stage.`);
    }
    if ((source.positionFrom ?? 1) < 1 || (source.positionTo ?? source.positionFrom ?? 1) < (source.positionFrom ?? 1)) {
      errors.push("Participant source position range is invalid.");
    }
  }

  for (const rule of stage.qualification) {
    if (rule.positionFrom < 1 || rule.positionTo < rule.positionFrom) {
      errors.push("Qualification position range is invalid.");
    }
    if (!rule.destinationCompetitionId && !rule.destinationStageId) {
      errors.push("Qualification rules need a destination competition or stage.");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
