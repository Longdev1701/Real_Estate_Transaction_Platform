const isBrowser = typeof window !== "undefined";

type CacheEnvelope<T> = {
  value: T;
  expiresAt?: number;
};

export const readSessionCache = <T>(key: string): T | null => {
  if (!isBrowser) return null;

  try {
    const rawValue = window.sessionStorage.getItem(key);
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
        window.sessionStorage.removeItem(key);
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
    const payload: CacheEnvelope<T> =
      options?.ttlMs && options.ttlMs > 0
        ? {
            value,
            expiresAt: Date.now() + options.ttlMs,
          }
        : { value };

    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Cache failures should not affect the page flow.
  }
};
