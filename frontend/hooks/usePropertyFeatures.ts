"use client";

import { useEffect, useState } from "react";

import { fetchPropertyFeatures, readCachedPropertyFeatures } from "@/lib/property-features-cache";
import type { PropertyFeature } from "@/lib/post-form";

export const usePropertyFeatures = (propertyType?: string) => {
  const [features, setFeatures] = useState<PropertyFeature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchFeatures = async () => {
      if (!propertyType) {
        setFeatures([]);
        setSelectedFeatureIds([]);
        return;
      }

      const cached = readCachedPropertyFeatures(propertyType);

      if (cached) {
        setFeatures(cached);
        const availableIds = new Set(cached.map((feature) => feature.id));
        setSelectedFeatureIds((prev) => prev.filter((id) => availableIds.has(id)));
      }

      try {
        const nextFeatures = await fetchPropertyFeatures(propertyType);

        setFeatures(nextFeatures);

        const availableIds = new Set(nextFeatures.map((feature) => feature.id));
        setSelectedFeatureIds((prev) => prev.filter((id) => availableIds.has(id)));
      } catch (error) {
        console.error("Lỗi tải đặc trưng:", error);
      }
    };

    void fetchFeatures();
  }, [propertyType]);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatureIds((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    );
  };

  return {
    features,
    selectedFeatureIds,
    setSelectedFeatureIds,
    toggleFeature,
  };
};
