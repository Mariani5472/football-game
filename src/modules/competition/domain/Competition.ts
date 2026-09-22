export interface Competition {
  id: number;
  externalId: number | null;
  countryId: number | null;

  name: string;
  slug: string;
  gender: string;
  image: string;

  primaryColor: string;
  secondaryColor: string;

  usualStartDate: Date
  usualEndSate: Date

  frequency: number;

  tier: number;
}