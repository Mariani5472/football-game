import type { ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  content: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}

export function Tabs<T extends string>({
  items,
  activeTab,
  onChange,
}: TabsProps<T>) {
  const activeItem = items.find((item) => item.id === activeTab);

  return (
    <div>
      <div className="flex gap-1 border-b border-white/10">
        {items.map((item) => {
          const active = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={[
                "border-b-2 px-4 py-3 text-sm transition",
                active
                  ? "border-emerald-400 text-emerald-200"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="pt-5">{activeItem?.content}</div>
    </div>
  );
}