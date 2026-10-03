import { ChevronRight } from "lucide-react";

export interface GeographyBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function GeographyBreadcrumb({
  items,
}: {
  items: GeographyBreadcrumbItem[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((item, index) => (
        <div
          key={item.label + index}
          className="flex items-center gap-2"
        >
          {index > 0 && (
            <ChevronRight size={12} className="text-slate-700" />
          )}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-white"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-300">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
