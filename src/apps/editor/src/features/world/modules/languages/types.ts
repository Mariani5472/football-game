import type {
  Language,
  LanguageFamily,
  LanguageGroup,
  LanguageSubgroup,
} from "../../types";

export interface LanguageSelection {
  family?: LanguageFamily;
  group?: LanguageGroup;
  subgroup?: LanguageSubgroup;
  language?: Language;
}