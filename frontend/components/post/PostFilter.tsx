"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpDown,
  Bike,
  Building,
  Car,
  ChevronDown,
  ChevronUp,
  Filter,
  HelpCircle,
  Home,
  Milestone,
  Search,
  Shield,
  Snowflake,
  Trees,
  Waves,
  Wifi,
  Wind,
  Armchair,
  Droplets,
  ThermometerSun,
  Scroll,
  Dog,
} from "lucide-react";

import { api } from "@/lib/api";
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

const featureIconMap: Record<string, React.ComponentType<any>> = {
  wifi: Wifi,
  wind: Wind,
  armchair: Armchair,
  droplets: Droplets,
  snowflake: Snowflake,
  "thermometer-sun": ThermometerSun,
  waves: Waves,
  "arrow-up-down": ArrowUpDown,
  car: Car,
  bike: Bike,
  shield: Shield,
  trees: Trees,
  building: Building,
  scroll: Scroll,
  milestone: Milestone,
  home: Home,
  dog: Dog,
};

const clampNumericText = (value: string) => value.replace(/\D/g, "");

const FeatureIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = featureIconMap[name] || HelpCircle;
  return <IconComponent className={className} />;
};

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
    const currentValue = Number(value) || 0;
    const nextValue = Math.max(0, currentValue + step * direction);
    onChange(nextValue > 0 ? String(nextValue) : "");
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(clampNumericText(event.target.value))}
        className="input-dark border-white/15 bg-slate-900/80 pr-9"
        placeholder={placeholder}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-white/10 bg-slate-950/70">
        <button
          type="button"
          onClick={() => updateByStep(1)}
          className="flex h-4 w-6 items-center justify-center text-gray-300 transition hover:bg-blue-500/20 hover:text-white"
          aria-label={`Tăng ${label}`}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => updateByStep(-1)}
          disabled={!Number(value)}
          className="flex h-4 w-6 items-center justify-center border-t border-white/10 text-gray-300 transition hover:bg-blue-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-gray-300"
          aria-label={`Giảm ${label}`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
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

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const url = value.propertyType ? `/features?propertyType=${value.propertyType}` : "/features";
        const response = await api.get<{ data: Feature[] }>(url);
        setFeatures(response.data.data);
      } catch (err) {
        console.error("Lỗi tải đặc trưng:", err);
      }
    };
    fetchFeatures();
  }, [value.propertyType]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://production.cas.so/address-kit/2025-07-01/provinces");
        const payload = await response.json();
        const nextProvinces: Province[] = (payload.provinces || []).map((province: any) => ({
          code: province.code,
          name: province.name,
        }));
        setProvinces(nextProvinces);

        if (value.city) {
          const matchedProvince = nextProvinces.find((province) => province.name === value.city);
          if (matchedProvince) {
            setSelectedProvinceCode(String(matchedProvince.code));
          }
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
        const response = await fetch(`https://production.cas.so/address-kit/2025-07-01/provinces/${selectedProvinceCode}/communes`);
        const payload = await response.json();
        const nextDistricts: District[] = (payload.communes || [])
          .map((district: any) => ({
            code: district.code,
            name: String(district.name).replace(/\n/g, "").trim(),
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

  const selectedIds = value.featureIds ? value.featureIds.split(",").filter(Boolean) : [];

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
    <section className="glass-card border-white/10 bg-slate-950/55 p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-300">
            <Filter className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-white">Bộ lọc tìm kiếm</h2>
        </div>
        <button type="button" onClick={onReset} className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
          Đặt lại
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Từ khóa</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
            <input
              type="text"
              value={value.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              className="input-dark border-white/15 bg-slate-900/80 pl-11"
              placeholder="Tên bài đăng, địa chỉ..."
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Vị trí</label>
          <div className="space-y-3">
            <div className="relative">
              <select
                value={selectedProvinceCode}
                onChange={(event) => handleProvinceChange(event.target.value)}
                className="input-dark appearance-none border-white/15 bg-slate-900/80 pr-10"
              >
                <option value="">Chọn tỉnh / thành phố</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative">
              <select
                value={selectedDistrictCode}
                onChange={(event) => handleDistrictChange(event.target.value)}
                disabled={!selectedProvinceCode}
                className="input-dark appearance-none border-white/15 bg-slate-900/80 pr-10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Chọn quận / huyện</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Loại bất động sản</label>
          <div className="relative">
            <select
              value={value.propertyType}
              onChange={(event) =>
                updateField("propertyType", event.target.value as PostFilterValue["propertyType"])
              }
              className="input-dark appearance-none border-white/15 bg-slate-900/80 pr-10"
            >
              <option value="">Chọn loại</option>
              {PROPERTY_TYPES.map((propertyType) => (
                <option key={propertyType} value={propertyType}>
                  {propertyTypeLabels[propertyType]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Khoảng giá</label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <StepperInput
              value={value.minPrice}
              placeholder="Từ"
              step={1_000_000}
              label="giá thấp nhất"
              onChange={(nextValue) => updateField("minPrice", nextValue)}
            />
            <span className="text-gray-500">-</span>
            <StepperInput
              value={value.maxPrice}
              placeholder="Đến"
              step={1_000_000}
              label="giá cao nhất"
              onChange={(nextValue) => updateField("maxPrice", nextValue)}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Diện tích</label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <StepperInput
              value={value.minArea}
              placeholder="Từ"
              step={10}
              label="diện tích thấp nhất"
              onChange={(nextValue) => updateField("minArea", nextValue)}
            />
            <span className="text-gray-500">-</span>
            <StepperInput
              value={value.maxArea}
              placeholder="Đến"
              step={10}
              label="diện tích cao nhất"
              onChange={(nextValue) => updateField("maxArea", nextValue)}
            />
          </div>
        </div>

        {features.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <label className="mb-2.5 block text-sm font-medium text-gray-200">Tiện ích & Đặc trưng</label>
            <div className="custom-scrollbar flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
              {features.map((feature) => {
                const isSelected = selectedIds.includes(feature.id);
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => toggleFeatureId(feature.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      isSelected
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                    }`}
                  >
                    <FeatureIcon name={feature.icon || "help-circle"} className="h-3.5 w-3.5" />
                    {feature.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      ` }} />

      <div className="mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3"
        >
          {isLoading ? "Đang tải..." : "Áp dụng bộ lọc"}
        </button>
      </div>
    </section>
  );
}
