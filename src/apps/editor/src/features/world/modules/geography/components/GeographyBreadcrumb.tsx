import { ChevronRight } from "lucide-react";

import type {
  GeographySelection,
} from "../types";

interface GeographyBreadcrumbProps {
  selection: GeographySelection;
}

export function GeographyBreadcrumb({
  selection,
}: GeographyBreadcrumbProps) {
  const items = [
    selection.continent?.name,
    selection.country?.name,
    selection.region?.name,
    selection.city?.name,
  ].filter(Boolean);

  if (items.length === 0) {
    return (
      <span className="text-sm text-slate-600">
        Select a location
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="flex items-center gap-2"
        >
          {index > 0 && (
            <ChevronRight
              size={13}
              className="text-slate-700"
            />
          )}

          <span
            className={
              index === items.length - 1
                ? "text-white"
                : "text-slate-500"
            }
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}