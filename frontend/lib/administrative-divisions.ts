const ADMINISTRATIVE_API_BASE_URL = "https://provinces.open-api.vn/api/v1";
const ADMINISTRATIVE_API_TIMEOUT_MS = 10_000;

export type Province = {
  code: number;
  name: string;
};

export type District = {
  code: number;
  name: string;
};

export type Ward = {
  code: number;
  name: string;
};

type OpenApiWard = {
  code: number;
  name: string;
};

type OpenApiDistrict = {
  code: number;
  name: string;
  wards?: OpenApiWard[];
};

type OpenApiProvince = {
  code: number;
  name: string;
  districts?: OpenApiDistrict[];
};

const cleanAdministrativeName = (value: string) => value.replace(/\n/g, "").trim();

const normalizeAdministrativeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

const stripAdministrativePrefix = (value: string) =>
  cleanAdministrativeName(value).replace(
    /^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|thi tran|phuong|xa)\s+/i,
    "",
  );

export const getAdministrativeDisplayName = (value: string) =>
  stripAdministrativePrefix(normalizeAdministrativeText(value));

const mapProvince = (province: OpenApiProvince): Province => ({
  code: Number(province.code),
  name: cleanAdministrativeName(province.name),
});

const mapDistrict = (district: OpenApiDistrict): District => ({
  code: Number(district.code),
  name: cleanAdministrativeName(district.name),
});

const mapWard = (ward: OpenApiWard): Ward => ({
  code: Number(ward.code),
  name: cleanAdministrativeName(ward.name),
});

const sortByVietnameseName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((left, right) => left.name.localeCompare(right.name, "vi"));

const provincesCache = new Map<string, Promise<Province[]>>();
const districtsCache = new Map<string, Promise<District[]>>();
const wardsCache = new Map<string, Promise<Ward[]>>();

const fetchJsonWithTimeout = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADMINISTRATIVE_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "force-cache",
    });

    if (!response.ok) {
      throw new Error(`Administrative API failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchProvinces = async (): Promise<Province[]> => {
  const cacheKey = "provinces";
  const cached = provincesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = fetchJsonWithTimeout<OpenApiProvince[]>(`${ADMINISTRATIVE_API_BASE_URL}/p/`)
    .then((payload) => sortByVietnameseName(payload.map(mapProvince)))
    .catch((error) => {
      provincesCache.delete(cacheKey);
      throw error;
    });

  provincesCache.set(cacheKey, request);
  return request;
};

export const fetchDistrictsByProvinceCode = async (provinceCode: string | number): Promise<District[]> => {
  const cacheKey = String(provinceCode);
  const cached = districtsCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = fetchJsonWithTimeout<OpenApiProvince>(`${ADMINISTRATIVE_API_BASE_URL}/p/${provinceCode}?depth=2`)
    .then((payload) => sortByVietnameseName((payload.districts ?? []).map(mapDistrict)))
    .catch((error) => {
      districtsCache.delete(cacheKey);
      throw error;
    });

  districtsCache.set(cacheKey, request);
  return request;
};

export const fetchWardsByDistrictCode = async (districtCode: string | number): Promise<Ward[]> => {
  const cacheKey = String(districtCode);
  const cached = wardsCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = fetchJsonWithTimeout<OpenApiDistrict>(`${ADMINISTRATIVE_API_BASE_URL}/d/${districtCode}?depth=2`)
    .then((payload) => sortByVietnameseName((payload.wards ?? []).map(mapWard)))
    .catch((error) => {
      wardsCache.delete(cacheKey);
      throw error;
    });

  wardsCache.set(cacheKey, request);
  return request;
};

export const findAdministrativeUnitByName = <T extends { name: string }>(items: T[], targetName?: string | null) => {
  if (!targetName) {
    return undefined;
  }

  const normalizedTarget = getAdministrativeDisplayName(targetName);
  return items.find((item) => getAdministrativeDisplayName(item.name) === normalizedTarget);
};

export const findAdministrativeUnitFromDisplayParts = <T extends { name: string }>(items: T[], displayParts: string[]) => {
  for (let index = displayParts.length - 1; index >= 0; index -= 1) {
    const currentPart = getAdministrativeDisplayName(displayParts[index]);
    const matched = items.find((item) => {
      const normalizedItem = getAdministrativeDisplayName(item.name);
      return (
        currentPart === normalizedItem ||
        currentPart.includes(normalizedItem) ||
        normalizedItem.includes(currentPart)
      );
    });

    if (matched) {
      return matched;
    }
  }

  return undefined;
};

export const splitAdministrativeDisplayName = (displayName: string) =>
  displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export const administrativeApiBaseUrl = ADMINISTRATIVE_API_BASE_URL;
