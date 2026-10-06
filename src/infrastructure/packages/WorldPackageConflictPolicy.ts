export interface DefaultConflictPolicyInput {
  eventRecord: boolean;
  compositeKey: boolean;
  incomingPriority: number;
  existingPriority: number;
}

/** Resolves attribute ownership using the package priority and immutable event policy. */
export class WorldPackageConflictPolicy {
  defaultPolicy(input: DefaultConflictPolicyInput): "KEEP_EXISTING" | "MERGE" | "KEEP_INCOMING" {
    if (input.eventRecord) return "KEEP_EXISTING";
    if (input.compositeKey) return "MERGE";
    return input.incomingPriority >= input.existingPriority ? "KEEP_INCOMING" : "KEEP_EXISTING";
  }
}