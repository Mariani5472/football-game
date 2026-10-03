import { ArrowLeft } from "lucide-react";
import type { GeographyTreeNode } from "../types";

export function GeographyCountryContext({
  continent,
  countryCount,
  onBack,
}: {
  continent: GeographyTreeNode;
  countryCount: number;
  onBack: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"
      >
        <ArrowLeft size={13} />
        Back to continents
      </button>

      <div className="mt-4">
        <h2 className="text-2xl font-semibold text-white">
          {continent.label}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {countryCount} countries in this continent
        </p>
      </div>
    </section>
  );
}
