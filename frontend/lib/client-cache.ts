const isBrowser = typeof window !== "undefined";

export const CLIENT_CACHE_VERSION =
  process.env.NEXT_PUBLIC_CLIENT_CACHE_VERSION?.trim() || "db-images-2026-06-17";

const CACHE_STORAGE_PREFIX = `trustestate-cache:${CLIENT_CACHE_VERSION}:`;

type CacheEnvelope<T> = {
  value: T;
  expiresAt?: number;
};

export const getVersionedStorageKey = (key: string) => `${CACHE_STORAGE_PREFIX}${key}`;

const toRawCacheKey = (storageKey: string) =>
  storageKey.startsWith(CACHE_STORAGE_PREFIX)
    ? storageKey.slice(CACHE_STORAGE_PREFIX.length)
    : null;

export const readSessionCache = <T>(key: string): T | null => {
  if (!isBrowser) return null;

  try {
    const storageKey = getVersionedStorageKey(key);
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as T | CacheEnvelope<T>;

    if (
      parsed &&
      typeof parsed === "object" &&
      "value" in parsed &&
      (!("expiresAt" in parsed) || typeof parsed.expiresAt === "number")
    ) {
      if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        window.sessionStorage.removeItem(storageKey);
        return null;
      }

      return parsed.value;
    }

    return parsed as T;
  } catch {
    return null;
  }
};

export const writeSessionCache = <T>(
  key: string,
  value: T,
  options?: { ttlMs?: number },
) => {
  if (!isBrowser) return;

  try {
    const storageKey = getVersionedStorageKey(key);
    const payload: CacheEnvelope<T> =
      options?.ttlMs && options.ttlMs > 0
        ? {
            value,
            expiresAt: Date.now() + options.ttlMs,
        }
        : { value };

    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Cache failures should not affect the page flow.
  }
};

export const updateSessionCache = <T>(
  key: string,
  updater: (value: T) => T,
) => {
  if (!isBrowser) return;

  try {
    const storageKey = getVersionedStorageKey(key);
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) return;

    const parsed = JSON.parse(rawValue) as T | CacheEnvelope<T>;
    const isEnvelope =
      parsed &&
      typeof parsed === "object" &&
      "value" in parsed &&
      (!("expiresAt" in parsed) || typeof parsed.expiresAt === "number");

    if (isEnvelope) {
      if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        window.sessionStorage.removeItem(storageKey);
        return;
      }

      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          ...parsed,
          value: updater(parsed.value),
        }),
      );
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(updater(parsed as T)));
  } catch {
    // Cache failures should not affect the page flow.
  }
};

export const updateSessionCaches = (
  predicate: (key: string) => boolean,
  updater: (value: unknown, key: string) => unknown,
) => {
  if (!isBrowser) return;

  try {
    const keys = Array.from({ length: window.sessionStorage.length }, (_, index) =>
      window.sessionStorage.key(index),
    )
      .map((storageKey) =>
        typeof storageKey === "string" ? toRawCacheKey(storageKey) : null,
      )
      .filter((key): key is string => typeof key === "string" && predicate(key));

    keys.forEach((key) => {
      updateSessionCache<unknown>(key, (value) => updater(value, key));
    });
  } catch {
    // Cache failures should not affect the page flow.
  }
};
