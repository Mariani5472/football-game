export interface Stadium {
  id: number;
  cityId: number;
  name: string;
  capacity?: number;
  seatedCapacity?: number;
  pitchTypeId?: number;
  ownerClubId?: number;
  qualityStateId?: number;
  environmentQualityId?: number;
  grassDeteriorationRateId?: number;
  hasCover: boolean;
  hasRetractableRoof: boolean;
  hasUnderfloorHeating: boolean;
  hasDigitalAdvertising: boolean;
}