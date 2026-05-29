const isBrowser = typeof window !== "undefined";

export const readSessionCache = <T>(key: string): T | null => {
  if (!isBrowser) return null;

  try {
    const rawValue = window.sessionStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
};

export const writeSessionCache = <T>(key: string, value: T) => {
  if (!isBrowser) return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures should not affect the page flow.
  }
};
