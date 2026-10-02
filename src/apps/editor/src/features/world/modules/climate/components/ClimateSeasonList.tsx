import type {
  Climate,
  ClimateSeason,
} from "../../../types";

interface ClimateSeasonListProps {
  climate: Climate;
  seasons: ClimateSeason[];
}

export function ClimateSeasonList({
  climate,
  seasons,
}: ClimateSeasonListProps) {
  const climateSeasons =
    seasons.filter(
      (season) =>
        season.climateId ===
        climate.id,
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4">
        <div className="text-sm font-medium text-white">
          {climate.name}
        </div>

        <div className="mt-1 text-xs text-slate-600">
          Seasonal configuration
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {climateSeasons.map(
          (season) => (
            <button
              key={season.id}
              type="button"
              className="rounded-xl border border-white/5 bg-black/10 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
              <div className="text-sm text-slate-300">
                {season.name}
              </div>

              <div className="mt-1 text-xs text-slate-600">
                Season {season.id}
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}