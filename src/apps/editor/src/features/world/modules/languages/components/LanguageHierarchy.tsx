import {
  ChevronRight,
} from "lucide-react";

import type {
  Language,
  LanguageFamily,
  LanguageGroup,
  LanguageSubgroup,
} from "../../../types";

interface LanguageHierarchyProps {
  families: LanguageFamily[];
  groups: LanguageGroup[];
  subgroups: LanguageSubgroup[];
  languages: Language[];

  onSelectLanguage?: (
    language: Language,
  ) => void;
}

export function LanguageHierarchy({
  families,
  groups,
  subgroups,
  languages,
  onSelectLanguage,
}: LanguageHierarchyProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      {families.map(
        (family) => (
          <div
            key={family.id}
            className="space-y-1"
          >
            <HierarchyRow
              label={family.name}
              level={0}
            />

            {groups
              .filter(
                (group) =>
                  group.familyId ===
                  family.id,
              )
              .map((group) => (
                <div key={group.id}>
                  <HierarchyRow
                    label={group.name}
                    level={1}
                  />

                  {subgroups
                    .filter(
                      (subgroup) =>
                        subgroup.groupId ===
                        group.id,
                    )
                    .map((subgroup) => (
                      <div
                        key={subgroup.id}
                      >
                        <HierarchyRow
                          label={
                            subgroup.name
                          }
                          level={2}
                        />

                        {languages
                          .filter(
                            (
                              language,
                            ) =>
                              language.subgroupId ===
                              subgroup.id,
                          )
                          .map(
                            (
                              language,
                            ) => (
                              <button
                                key={
                                  language.id
                                }
                                type="button"
                                onClick={() =>
                                  onSelectLanguage?.(
                                    language,
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                                style={{
                                  paddingLeft:
                                    12 +
                                    3 *
                                      20,
                                }}
                              >
                                <ChevronRight
                                  size={
                                    14
                                  }
                                  className="text-slate-600"
                                />

                                {
                                  language.name
                                }
                              </button>
                            ),
                          )}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ),
      )}
    </div>
  );
}

function HierarchyRow({
  label,
  level,
}: {
  label: string;
  level: number;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300"
      style={{
        paddingLeft:
          12 + level * 20,
      }}
    >
      <ChevronRight
        size={14}
        className="text-slate-600"
      />

      <span>{label}</span>
    </div>
  );
}