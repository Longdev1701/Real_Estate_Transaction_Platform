import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import type { PropertyFeature } from "@/lib/post-form";

const FEATURE_CACHE_TTL_MS = 30 * 60 * 1000;
const memoryFeatureCache = new Map<string, PropertyFeature[]>();
const pendingFeatureRequests = new Map<string, Promise<PropertyFeature[]>>();

const getFeatureCacheKey = (propertyType?: string) => `features:${propertyType || "all"}`;

const readLocalFeatureCache = (cacheKey: string) => {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(cacheKey);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as {
      value?: PropertyFeature[];
      expiresAt?: number;
    };

    if (!Array.isArray(parsed.value) || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
};

const writeLocalFeatureCache = (cacheKey: string, features: PropertyFeature[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        value: features,
        expiresAt: Date.now() + FEATURE_CACHE_TTL_MS,
      }),
    );
  } catch {
    // Cache failures should not block UI.
  }
};

export const readCachedPropertyFeatures = (propertyType?: string) => {
  const cacheKey = getFeatureCacheKey(propertyType);
  const memoryFeatures = memoryFeatureCache.get(cacheKey);
  if (memoryFeatures) return memoryFeatures;

  const sessionFeatures = readSessionCache<PropertyFeature[]>(cacheKey);
  if (sessionFeatures) {
    memoryFeatureCache.set(cacheKey, sessionFeatures);
    return sessionFeatures;
  }

  const localFeatures = readLocalFeatureCache(cacheKey);
  if (localFeatures) {
    memoryFeatureCache.set(cacheKey, localFeatures);
    writeSessionCache(cacheKey, localFeatures, { ttlMs: FEATURE_CACHE_TTL_MS });
    return localFeatures;
  }

  return null;
};

export const fetchPropertyFeatures = (propertyType?: string) => {
  const cacheKey = getFeatureCacheKey(propertyType);
  const cached = readCachedPropertyFeatures(propertyType);
  if (cached) return Promise.resolve(cached);

  const pendingRequest = pendingFeatureRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = api
    .get<{ data: PropertyFeature[] }>(propertyType ? `/features?propertyType=${propertyType}` : "/features")
    .then((response) => {
      const features = response.data.data;
      memoryFeatureCache.set(cacheKey, features);
      writeSessionCache(cacheKey, features, { ttlMs: FEATURE_CACHE_TTL_MS });
      writeLocalFeatureCache(cacheKey, features);
      return features;
    })
    .finally(() => {
      pendingFeatureRequests.delete(cacheKey);
    });

  pendingFeatureRequests.set(cacheKey, request);
  return request;
};
