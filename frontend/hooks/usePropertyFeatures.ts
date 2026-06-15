"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
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

      const cacheKey = `features:${propertyType}`;
      const cached = readSessionCache<PropertyFeature[]>(cacheKey);

      if (cached) {
        setFeatures(cached);
        const availableIds = new Set(cached.map((feature) => feature.id));
        setSelectedFeatureIds((prev) => prev.filter((id) => availableIds.has(id)));
        return;
      }

      try {
        const response = await api.get<{ data: PropertyFeature[] }>(
          `/features?propertyType=${propertyType}`,
        );
        const nextFeatures = response.data.data;

        setFeatures(nextFeatures);
        writeSessionCache(cacheKey, nextFeatures, { ttlMs: 30 * 60 * 1000 });

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
