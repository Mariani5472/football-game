export interface DefaultConflictPolicyInput {
  eventRecord: boolean;
  compositeKey: boolean;
  incomingPriority: number;
  existingPriority: number;
}

/**
 * Priority is the ownership rule for scalar data.
 * Composite relation rows merge by identity; immutable event records do not override.
 */
export class WorldPackageConflictPolicy {
  defaultPolicy(
    input: DefaultConflictPolicyInput,
  ): "KEEP_EXISTING" | "MERGE" | "KEEP_INCOMING" {
    if (input.eventRecord) return "KEEP_EXISTING";
    if (input.compositeKey) return "MERGE";
    return input.incomingPriority >= input.existingPriority
      ? "KEEP_INCOMING"
      : "KEEP_EXISTING";
  }
}
