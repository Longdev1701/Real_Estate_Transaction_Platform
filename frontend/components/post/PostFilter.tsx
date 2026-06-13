"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  SlidersHorizontal,
} from "lucide-react";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { FeatureIcon } from "@/lib/feature-icons";
import { groupFeaturesByCategory } from "@/lib/feature-groups";
import {
  PROPERTY_TYPES,
  propertyTypeLabels,
  type PostFilterValue,
} from "@/lib/posts";

interface Feature {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
}

interface Province {
  code: number;
  name: string;
}

interface District {
  code: number;
  name: string;
}

const clampNumericText = (value: string) => value.replace(/\D/g, "");
const parseNumericText = (value: string) => Number(clampNumericText(value)) || 0;
const formatNumericText = (value: string) =>
  value ? new Intl.NumberFormat("vi-VN").format(parseNumericText(value)) : "";

function StepperInput({
  value,
  onChange,
  placeholder,
  step,
  label,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  step: number;
  label: string;
}) {
  const updateByStep = (direction: 1 | -1) => {
    const currentValue = parseNumericText(value);
    const nextValue = Math.max(0, currentValue + step * direction);
    onChange(nextValue > 0 ? String(nextValue) : "");
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        inputMode="numeric"
        value={formatNumericText(value)}
        onChange={(event) => onChange(clampNumericText(event.target.value))}
        className="theme-input-surface w-full rounded-xl px-2 py-2 pr-7 text-xs placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
        placeholder={placeholder}
      />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => updateByStep(1)}
          className="flex h-3.5 w-4 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label={`Tăng ${label}`}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => updateByStep(-1)}
          disabled={!Number(value)}
          className="flex h-3.5 w-4 items-center justify-center border-t border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20"
          aria-label={`Giảm ${label}`}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

type PostFilterProps = {
  value: PostFilterValue;
  isLoading: boolean;
  onChange: (nextValue: PostFilterValue) => void;
  onSubmit: () => void;
  onReset: () => void;
};

export function PostFilter({
  value,
  isLoading,
  onChange,
  onSubmit,
  onReset,
}: PostFilterProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("");
  const [showFeatures, setShowFeatures] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      const cacheKey = `features:${value.propertyType || "all"}`;
      const cached = readSessionCache<Feature[]>(cacheKey);
      if (cached) {
        setFeatures(cached);
        return;
      }

      try {
        const url = value.propertyType ? `/features?propertyType=${value.propertyType}` : "/features";
        const response = await api.get<{ data: Feature[] }>(url);
        setFeatures(response.data.data);
        writeSessionCache(cacheKey, response.data.data, { ttlMs: 30 * 60 * 1000 });
      } catch (err) {
        console.error("Lỗi tải đặc trưng:", err);
      }
    };
    fetchFeatures();
  }, [value.propertyType]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://esgoo.net/api-tinhthanh/1/0.htm");
        const payload = await response.json();
        const nextProvinces: Province[] = (payload.data || []).map((province: any) => ({
          code: Number(province.id),
          name: province.full_name,
        }));
        setProvinces(nextProvinces);

        if (value.city) {
          const matchedProvince = nextProvinces.find((province) => province.name === value.city);
          if (matchedProvince) {
            setSelectedProvinceCode(String(matchedProvince.code));
          }
        } else {
          setSelectedProvinceCode("");
        }
      } catch (err) {
        console.error("Lỗi tải danh sách tỉnh/thành:", err);
      }
    };

    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchDistricts = async () => {
      if (!selectedProvinceCode) {
        setDistricts([]);
        setSelectedDistrictCode("");
        return;
      }

      try {
        const response = await fetch(`https://esgoo.net/api-tinhthanh/2/${selectedProvinceCode}.htm`);
        const payload = await response.json();
        const nextDistricts: District[] = (payload.data || [])
          .map((district: any) => ({
            code: Number(district.id),
            name: String(district.full_name).replace(/\n/g, "").trim(),
          }))
          .sort((left: District, right: District) => left.name.localeCompare(right.name, "vi"));
        setDistricts(nextDistricts);

        if (value.district) {
          const matchedDistrict = nextDistricts.find((district) => district.name === value.district);
          setSelectedDistrictCode(matchedDistrict ? String(matchedDistrict.code) : "");
        }
      } catch (err) {
        console.error("Lỗi tải danh sách quận/huyện:", err);
      }
    };

    fetchDistricts();
  }, [selectedProvinceCode, value.district]);

  useEffect(() => {
    if (!value.city) {
      setSelectedProvinceCode("");
      setSelectedDistrictCode("");
      return;
    }

    const matchedProvince = provinces.find((province) => province.name === value.city);
    setSelectedProvinceCode(matchedProvince ? String(matchedProvince.code) : "");
  }, [provinces, value.city]);

  useEffect(() => {
    if (!value.district) {
      setSelectedDistrictCode("");
      return;
    }

    const matchedDistrict = districts.find((district) => district.name === value.district);
    setSelectedDistrictCode(matchedDistrict ? String(matchedDistrict.code) : "");
  }, [districts, value.district]);

  const selectedIds = value.featureIds ? value.featureIds.split(",").filter(Boolean) : [];
  const groupedFeatures = useMemo(() => groupFeaturesByCategory(features), [features]);

  const updateField = <K extends keyof PostFilterValue>(key: K, fieldValue: PostFilterValue[K]) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const toggleFeatureId = (id: string) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    updateField("featureIds", nextIds.join(","));
  };

  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode);
    setSelectedDistrictCode("");
    const city = provinces.find((province) => String(province.code) === provinceCode)?.name ?? "";
    onChange({
      ...value,
      city,
      district: "",
    });
  };

  const handleDistrictChange = (districtCode: string) => {
    setSelectedDistrictCode(districtCode);
    const district = districts.find((item) => String(item.code) === districtCode)?.name ?? "";
    updateField("district", district);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="glass-card w-full rounded-2xl p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="theme-badge-info rounded-xl p-1.5">
            <Filter className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Bộ lọc tìm kiếm</h2>
        </div>
        <button type="button" onClick={onReset} className="text-xs font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]">
          Đặt lại
        </button>
      </div>

      <div className="space-y-3.5">

        {/* Vị trí (Tỉnh/Thành & Quận/Huyện song song) */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--secondary-foreground)]">Khu vực</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={selectedProvinceCode}
                onChange={(event) => handleProvinceChange(event.target.value)}
                className="theme-input-surface w-full appearance-none rounded-xl px-2 py-2 pr-7 text-xs focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">Tỉnh/Thành</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" />
            </div>
            <div className="relative">
              <select
                value={selectedDistrictCode}
                onChange={(event) => handleDistrictChange(event.target.value)}
                disabled={!selectedProvinceCode}
                className="theme-input-surface w-full appearance-none rounded-xl px-2 py-2 pr-7 text-xs focus:border-[var(--accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                <option value="">Quận/Huyện</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" />
            </div>
          </div>
        </div>

        {/* Loại BĐS */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--secondary-foreground)]">Loại BĐS</label>
          <div className="relative">
            <select
              value={value.propertyType}
              onChange={(event) =>
                updateField("propertyType", event.target.value as PostFilterValue["propertyType"])
              }
              className="theme-input-surface w-full appearance-none rounded-xl px-3 py-2 pr-8 text-xs focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">Tất cả các loại</option>
              {PROPERTY_TYPES.map((propertyType) => (
                <option key={propertyType} value={propertyType}>
                  {propertyTypeLabels[propertyType]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          </div>
        </div>

        {/* Khoảng giá */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--secondary-foreground)]">Giá bán (VNĐ)</label>
          <div className="flex items-center gap-1.5">
            <StepperInput
              value={value.minPrice}
              placeholder="Từ"
              step={1_000_000}
              label="giá thấp nhất"
              onChange={(nextValue) => updateField("minPrice", nextValue)}
            />
            <span className="text-xs text-[var(--muted)]">-</span>
            <StepperInput
              value={value.maxPrice}
              placeholder="Đến"
              step={1_000_000}
              label="giá cao nhất"
              onChange={(nextValue) => updateField("maxPrice", nextValue)}
            />
          </div>
        </div>

        {/* Diện tích */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--secondary-foreground)]">Diện tích (m²)</label>
          <div className="flex items-center gap-1.5">
            <StepperInput
              value={value.minArea}
              placeholder="Từ"
              step={10}
              label="diện tích thấp nhất"
              onChange={(nextValue) => updateField("minArea", nextValue)}
            />
            <span className="text-xs text-[var(--muted)]">-</span>
            <StepperInput
              value={value.maxArea}
              placeholder="Đến"
              step={10}
              label="diện tích cao nhất"
              onChange={(nextValue) => updateField("maxArea", nextValue)}
            />
          </div>
        </div>

        {/* Tiện ích mở rộng (Collapsible) */}
        <div className="border-t border-[var(--border)] pt-2">
          <button
            type="button"
            onClick={() => setShowFeatures(!showFeatures)}
            className="flex w-full items-center justify-between text-xs font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Tiện ích & Đặc trưng
            </span>
            <span className="flex items-center gap-2">
              <span className="theme-badge-info rounded-full px-1.5 py-0.5 text-[10px]">
                {selectedIds.length}
              </span>

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-300 ${showFeatures ? "rotate-180" : ""
                  }`}
              />
            </span>
          </button>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${showFeatures
                ? "mt-2.5 border-t border-[var(--border)] pt-2.5 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
              }`}
          >
            <div className="overflow-hidden">
              {features.length === 0 ? (
                <div className="flex h-12 items-center justify-center text-[10px] text-[var(--muted-foreground)]">
                  Đang tải tiện ích...
                </div>
              ) : (
                <div className="max-h-56 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                  {groupedFeatures.map(([category, list]) => (
                    <section key={category} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          {category}
                        </h4>
                        <span className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {list.map((feature) => {
                          const isSelected = selectedIds.includes(feature.id);
                          return (
                            <button
                              key={feature.id}
                              type="button"
                              onClick={() => toggleFeatureId(feature.id)}
                              className={`flex min-w-0 items-center gap-1 rounded-lg border px-2 py-1 text-left text-[10px] font-medium transition-all duration-200 ${isSelected
                                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                                }`}
                            >
                              <FeatureIcon name={feature.icon || "help-circle"} className="h-2.5 w-2.5 shrink-0" />
                              <span className="min-w-0 break-words leading-snug">{feature.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-2.5 text-xs font-semibold disabled:opacity-50"
        >
          {isLoading ? "Đang tải..." : "Áp dụng bộ lọc"}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 9px;
        }
      ` }} />
    </form>
  );
}
