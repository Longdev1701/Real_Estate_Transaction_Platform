const ADMINISTRATIVE_API_BASE_URL = "https://provinces.open-api.vn/api";

const isClient = typeof window !== "undefined";

const getCachedData = <T>(key: string): T | null => {
  if (!isClient) return null;
  try {
    const cached = window.localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return parsed.data as T;
      }
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.error("Error reading administrative cache", e);
  }
  return null;
};

const setCachedData = <T>(key: string, data: T) => {
  if (!isClient) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        data,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      })
    );
  } catch (e) {
    console.error("Error writing administrative cache", e);
  }
};

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

export const fetchProvinces = async (): Promise<Province[]> => {
  const cacheKey = "admin_div_provinces";
  const cached = getCachedData<Province[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${ADMINISTRATIVE_API_BASE_URL}/p/`);
  const payload = (await response.json()) as OpenApiProvince[];
  const data = sortByVietnameseName(payload.map(mapProvince));
  setCachedData(cacheKey, data);
  return data;
};

export const fetchDistrictsByProvinceCode = async (provinceCode: string | number): Promise<District[]> => {
  const cacheKey = `admin_div_districts_${provinceCode}`;
  const cached = getCachedData<District[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${ADMINISTRATIVE_API_BASE_URL}/p/${provinceCode}?depth=2`);
  const payload = (await response.json()) as OpenApiProvince;
  const data = sortByVietnameseName((payload.districts ?? []).map(mapDistrict));
  setCachedData(cacheKey, data);
  return data;
};

export const fetchWardsByDistrictCode = async (districtCode: string | number): Promise<Ward[]> => {
  const cacheKey = `admin_div_communes_${districtCode}`;
  const cached = getCachedData<Ward[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${ADMINISTRATIVE_API_BASE_URL}/d/${districtCode}?depth=2`);
  const payload = (await response.json()) as OpenApiDistrict;
  const data = sortByVietnameseName((payload.wards ?? []).map(mapWard));
  setCachedData(cacheKey, data);
  return data;
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
