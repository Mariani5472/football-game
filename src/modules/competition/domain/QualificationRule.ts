export type QualificationType =
  | "QUALIFIED"
  | "RELEGATED";

export interface QualificationRule {
  id: number;
  stageId: number;
  positionFrom: number;
  positionTo: number;
  qualificationType: QualificationType;
  destination: string;
}