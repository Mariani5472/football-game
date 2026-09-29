export interface Person {
  id: number;
  fullName: string;
  commonName?: string;
  birthDate?: string;
  birthCityId?: number;
  nationalityId?: number;
  languageIds: number[];
}

export interface PersonDraft {
  fullName: string;
  commonName: string;
  birthDate: string;
  birthCityId: string;
  nationalityId: string;
  languageIds: number[];
}
