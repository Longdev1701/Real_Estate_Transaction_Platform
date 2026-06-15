"use client";

import { Check } from "lucide-react";

import { FeatureIcon } from "@/lib/feature-icons";
import { groupFeaturesByCategory } from "@/lib/feature-groups";
import type { PropertyFeature } from "@/lib/post-form";

type PostFeatureSelectorProps = {
  features: PropertyFeature[];
  selectedFeatureIds: string[];
  onToggle: (featureId: string) => void;
};

export function PostFeatureSelector({
  features,
  selectedFeatureIds,
  onToggle,
}: PostFeatureSelectorProps) {
  const groupedFeatures = groupFeaturesByCategory(features);

  return (
    <div className="space-y-4">
      {groupedFeatures.map(([category, featureList]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {category}
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {featureList.map((feature) => {
              const isSelected = selectedFeatureIds.includes(feature.id);

              return (
                <div
                  key={feature.id}
                  onClick={() => onToggle(feature.id)}
                  className={`group flex cursor-pointer select-none items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition-all duration-300 ${
                    isSelected
                      ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color:var(--accent-border)] shadow-[var(--shadow-glow)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-foreground)] hover:border-[var(--accent-border)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FeatureIcon
                      name={feature.icon || "help-circle"}
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                        isSelected ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"
                      }`}
                    />
                    <span className="min-w-0 break-words leading-snug">{feature.name}</span>
                  </div>
                  {isSelected ? (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
