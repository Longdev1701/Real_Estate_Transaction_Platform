"use client";

import { useCallback, useState } from "react";
import type { FieldPath, FieldValues, UseFormSetValue } from "react-hook-form";

import {
  fetchDistrictsByProvinceCode,
  fetchProvinces,
  fetchWardsByDistrictCode,
  findAdministrativeUnitByName,
  type District,
  type Province,
  type Ward,
} from "@/lib/administrative-divisions";

type LocationFieldValues = FieldValues & {
  city: string;
  district: string;
  ward?: string;
  latitude: unknown;
  longitude: unknown;
};

type UseAdministrativeDivisionsOptions<TFieldValues extends LocationFieldValues> = {
  setValue: UseFormSetValue<TFieldValues>;
  onLocationReset?: () => void;
  shouldDirtyCoordinates?: boolean;
};

const buildSetValueOptions = (shouldDirty = false) => ({
  shouldValidate: true,
  ...(shouldDirty ? { shouldDirty: true } : {}),
});

export const useAdministrativeDivisions = <TFieldValues extends LocationFieldValues>({
  setValue,
  onLocationReset,
  shouldDirtyCoordinates = false,
}: UseAdministrativeDivisionsOptions<TFieldValues>) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");

  const setFieldValue = useCallback(
    <TPath extends FieldPath<TFieldValues>>(
      field: TPath,
      value: TFieldValues[TPath],
      shouldDirty = false,
    ) => {
      setValue(field, value, buildSetValueOptions(shouldDirty));
    },
    [setValue],
  );

  const resetLocationCoordinates = useCallback(() => {
    setFieldValue("latitude" as FieldPath<TFieldValues>, 0 as TFieldValues[FieldPath<TFieldValues>], shouldDirtyCoordinates);
    setFieldValue("longitude" as FieldPath<TFieldValues>, 0 as TFieldValues[FieldPath<TFieldValues>], shouldDirtyCoordinates);
    onLocationReset?.();
  }, [onLocationReset, setFieldValue, shouldDirtyCoordinates]);

  const ensureProvincesLoaded = useCallback(async () => {
    if (provinces.length > 0) {
      return provinces;
    }

    const provinceList = await fetchProvinces();
    setProvinces(provinceList);
    return provinceList;
  }, [provinces]);

  const syncSelectionByNames = useCallback(async ({
    city,
    district,
    ward,
  }: {
    city?: string | null;
    district?: string | null;
    ward?: string | null;
  }) => {
    const provinceList = await ensureProvincesLoaded();

    if (!city) {
      setSelectedProvinceCode("");
      setSelectedDistrictCode("");
      setDistricts([]);
      setWards([]);
      return;
    }

    const matchedProvince = findAdministrativeUnitByName(provinceList, city);

    if (!matchedProvince) {
      return;
    }

    const provinceCode = String(matchedProvince.code);
    setSelectedProvinceCode(provinceCode);

    const districtList = await fetchDistrictsByProvinceCode(matchedProvince.code);
    setDistricts(districtList);

    if (!district) {
      setSelectedDistrictCode("");
      setWards([]);
      return;
    }

    const matchedDistrict = findAdministrativeUnitByName(districtList, district);

    if (!matchedDistrict) {
      setSelectedDistrictCode("");
      setWards([]);
      return;
    }

    const districtCode = String(matchedDistrict.code);
    setSelectedDistrictCode(districtCode);

    const wardList = await fetchWardsByDistrictCode(matchedDistrict.code);
    setWards(wardList);

    if (!ward) {
      return;
    }

    const matchedWard = findAdministrativeUnitByName(wardList, ward);

    if (matchedWard) {
      setFieldValue("ward" as FieldPath<TFieldValues>, matchedWard.name as TFieldValues[FieldPath<TFieldValues>]);
    }
  }, [ensureProvincesLoaded, setFieldValue]);

  const handleProvinceCodeChange = useCallback(async (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode);
    setSelectedDistrictCode("");
    setDistricts([]);
    setWards([]);

    if (provinceCode) {
      const provinceName =
        provinces.find((province) => String(province.code) === provinceCode)?.name || "";
      setFieldValue("city" as FieldPath<TFieldValues>, provinceName as TFieldValues[FieldPath<TFieldValues>]);

      try {
        setDistricts(await fetchDistrictsByProvinceCode(provinceCode));
      } catch (error) {
        console.error("Lỗi tải danh sách quận huyện:", error);
      }
    } else {
      setFieldValue("city" as FieldPath<TFieldValues>, "" as TFieldValues[FieldPath<TFieldValues>]);
    }

    setFieldValue("district" as FieldPath<TFieldValues>, "" as TFieldValues[FieldPath<TFieldValues>]);
    setFieldValue("ward" as FieldPath<TFieldValues>, "" as TFieldValues[FieldPath<TFieldValues>]);
    resetLocationCoordinates();
  }, [provinces, resetLocationCoordinates, setFieldValue]);

  const handleDistrictCodeChange = useCallback(async (districtCode: string) => {
    setSelectedDistrictCode(districtCode);
    setWards([]);

    if (districtCode) {
      const districtName =
        districts.find((district) => String(district.code) === districtCode)?.name || "";
      setFieldValue(
        "district" as FieldPath<TFieldValues>,
        districtName as TFieldValues[FieldPath<TFieldValues>],
      );

      try {
        setWards(await fetchWardsByDistrictCode(districtCode));
      } catch (error) {
        console.error("Lỗi tải danh sách phường xã:", error);
      }
    } else {
      setFieldValue("district" as FieldPath<TFieldValues>, "" as TFieldValues[FieldPath<TFieldValues>]);
    }

    setFieldValue("ward" as FieldPath<TFieldValues>, "" as TFieldValues[FieldPath<TFieldValues>]);
    resetLocationCoordinates();
  }, [districts, resetLocationCoordinates, setFieldValue]);

  const handleWardChange = useCallback((wardName: string) => {
    setFieldValue("ward" as FieldPath<TFieldValues>, wardName as TFieldValues[FieldPath<TFieldValues>]);
  }, [setFieldValue]);

  return {
    provinces,
    districts,
    wards,
    selectedProvinceCode,
    selectedDistrictCode,
    ensureProvincesLoaded,
    syncSelectionByNames,
    handleProvinceCodeChange,
    handleDistrictCodeChange,
    handleWardChange,
    resetLocationCoordinates,
    setProvinces,
    setDistricts,
    setWards,
    setSelectedProvinceCode,
    setSelectedDistrictCode,
  };
};
