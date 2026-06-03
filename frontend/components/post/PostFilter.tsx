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
  SlidersHorizontal,
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
    <div className="relative flex-1 min-w-0">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(clampNumericText(event.target.value))}
        className="w-full text-xs rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-7"
        placeholder={placeholder}
      />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded bg-slate-950/70">
        <button
          type="button"
          onClick={() => updateByStep(1)}
          className="flex h-3.5 w-4 items-center justify-center text-gray-400 hover:text-white"
          aria-label={`Tăng ${label}`}
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => updateByStep(-1)}
          disabled={!Number(value)}
          className="flex h-3.5 w-4 items-center justify-center border-t border-white/10 text-gray-400 hover:text-white disabled:opacity-20"
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
  const [showFeatures, setShowFeatures] = useState(false);
 
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="glass-card border-white/10 bg-slate-950/55 p-4 rounded-2xl w-full"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-1.5 text-blue-300">
            <Filter className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-white">Bộ lọc tìm kiếm</h2>
        </div>
        <button type="button" onClick={onReset} className="text-xs font-medium text-blue-300 transition hover:text-blue-200">
          Đặt lại
        </button>
      </div>
 
      <div className="space-y-3.5">
        
        {/* Từ khóa */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-300">Từ khóa</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-300" />
            <input
              type="text"
              value={value.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              className="w-full text-xs rounded-xl border border-white/10 bg-slate-900/80 py-2 pl-9 pr-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Tên bài đăng, địa chỉ..."
            />
          </div>
        </div>
 
        {/* Vị trí (Tỉnh/Thành & Quận/Huyện song song) */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-300">Khu vực</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={selectedProvinceCode}
                onChange={(event) => handleProvinceChange(event.target.value)}
                className="w-full text-xs rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2 text-white appearance-none focus:border-blue-500 focus:outline-none pr-7 cursor-pointer"
              >
                <option value="">Tỉnh/Thành</option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative">
              <select
                value={selectedDistrictCode}
                onChange={(event) => handleDistrictChange(event.target.value)}
                disabled={!selectedProvinceCode}
                className="w-full text-xs rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2 text-white appearance-none focus:border-blue-500 focus:outline-none pr-7 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">Quận/Huyện</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>
 
        {/* Loại BĐS */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-300">Loại BĐS</label>
          <div className="relative">
            <select
              value={value.propertyType}
              onChange={(event) =>
                updateField("propertyType", event.target.value as PostFilterValue["propertyType"])
              }
              className="w-full text-xs rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white appearance-none focus:border-blue-500 focus:outline-none pr-8 cursor-pointer"
            >
              <option value="">Tất cả các loại</option>
              {PROPERTY_TYPES.map((propertyType) => (
                <option key={propertyType} value={propertyType}>
                  {propertyTypeLabels[propertyType]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
 
        {/* Khoảng giá */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-300">Giá bán (VNĐ)</label>
          <div className="flex items-center gap-1.5">
            <StepperInput
              value={value.minPrice}
              placeholder="Từ"
              step={1_000_000}
              label="giá thấp nhất"
              onChange={(nextValue) => updateField("minPrice", nextValue)}
            />
            <span className="text-gray-600 text-xs">-</span>
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
          <label className="mb-1 block text-xs font-semibold text-gray-300">Diện tích (m²)</label>
          <div className="flex items-center gap-1.5">
            <StepperInput
              value={value.minArea}
              placeholder="Từ"
              step={10}
              label="diện tích thấp nhất"
              onChange={(nextValue) => updateField("minArea", nextValue)}
            />
            <span className="text-gray-600 text-xs">-</span>
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
        {features.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowFeatures(!showFeatures)}
              className="flex w-full items-center justify-between text-xs text-blue-300 hover:text-blue-200 transition font-medium"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Tiện ích & Đặc trưng
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                {selectedIds.length}
              </span>
            </button>
            
            {showFeatures && (
              <div className="mt-2.5 pt-2.5 border-t border-white/5 animate-fadeIn">
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {features.map((feature) => {
                    const isSelected = selectedIds.includes(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => toggleFeatureId(feature.id)}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-200 text-left truncate ${
                          isSelected
                            ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                            : "border-white/5 bg-white/[0.03] text-gray-400 hover:border-white/15 hover:text-gray-200"
                        }`}
                      >
                        <FeatureIcon name={feature.icon || "help-circle"} className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{feature.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
 
      </div>
 
      <div className="mt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition shadow-[0_0_15px_rgba(37,99,235,0.25)]"
        >
          {isLoading ? "Đang tải..." : "Áp dụng bộ lọc"}
        </button>
      </div>
 
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9px;
        }
      ` }} />
    </form>
  );
}
