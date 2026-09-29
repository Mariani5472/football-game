import type {
  Climate,
  ClimateSeason,
} from "../../types";

export interface ClimateSelection {
  climate?: Climate;
  season?: ClimateSeason;
}