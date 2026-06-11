"use client";

import Link from "next/link";
import {
  Home,
  MapPin,
  Ruler,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  PROPERTY_TYPES,
  propertyTypeLabels,
  type PropertyType,
} from "@/lib/posts";

import { CitySelect } from "@/components/home/CitySelect";
import { HomeSearchSelect } from "@/components/home/HomeSearchSelect";

type PopularLocation = {
  city: string;
};

type Option = {
  value: string;
  label: string;
};

const defaultPriceOptions: Option[] = [
  { value: "1000000000", label: "Dưới 1 tỷ" },
  { value: "3000000000", label: "Dưới 3 tỷ" },
  { value: "5000000000", label: "Dưới 5 tỷ" },
  { value: "10000000000", label: "Dưới 10 tỷ" },
];

const defaultAreaOptions: Option[] = [
  { value: "30", label: "Từ 30 m²" },
  { value: "50", label: "Từ 50 m²" },
  { value: "80", label: "Từ 80 m²" },
  { value: "120", label: "Từ 120 m²" },
];

const propertyPriceOptions: Record<PropertyType, Option[]> = {
  APARTMENT: [
    { value: "1500000000", label: "Dưới 1,5 tỷ" },
    { value: "3000000000", label: "Dưới 3 tỷ" },
    { value: "5000000000", label: "Dưới 5 tỷ" },
    { value: "8000000000", label: "Dưới 8 tỷ" },
  ],
  HOUSE: [
    { value: "2000000000", label: "Dưới 2 tỷ" },
    { value: "4000000000", label: "Dưới 4 tỷ" },
    { value: "7000000000", label: "Dưới 7 tỷ" },
    { value: "12000000000", label: "Dưới 12 tỷ" },
  ],
  LAND: [
    { value: "1000000000", label: "Dưới 1 tỷ" },
    { value: "2500000000", label: "Dưới 2,5 tỷ" },
    { value: "5000000000", label: "Dưới 5 tỷ" },
    { value: "10000000000", label: "Dưới 10 tỷ" },
  ],
  ROOM: [
    { value: "3000000", label: "Dưới 3 triệu/tháng" },
    { value: "5000000", label: "Dưới 5 triệu/tháng" },
    { value: "8000000", label: "Dưới 8 triệu/tháng" },
    { value: "12000000", label: "Dưới 12 triệu/tháng" },
  ],
  VILLA: [
    { value: "8000000000", label: "Dưới 8 tỷ" },
    { value: "15000000000", label: "Dưới 15 tỷ" },
    { value: "30000000000", label: "Dưới 30 tỷ" },
    { value: "60000000000", label: "Dưới 60 tỷ" },
  ],
  OFFICE: [
    { value: "3000000000", label: "Dưới 3 tỷ" },
    { value: "7000000000", label: "Dưới 7 tỷ" },
    { value: "15000000000", label: "Dưới 15 tỷ" },
    { value: "30000000000", label: "Dưới 30 tỷ" },
  ],
  SHOPHOUSE: [
    { value: "5000000000", label: "Dưới 5 tỷ" },
    { value: "10000000000", label: "Dưới 10 tỷ" },
    { value: "20000000000", label: "Dưới 20 tỷ" },
    { value: "40000000000", label: "Dưới 40 tỷ" },
  ],
  WAREHOUSE: [
    { value: "4000000000", label: "Dưới 4 tỷ" },
    { value: "10000000000", label: "Dưới 10 tỷ" },
    { value: "20000000000", label: "Dưới 20 tỷ" },
    { value: "50000000000", label: "Dưới 50 tỷ" },
  ],
};

const propertyAreaOptions: Record<PropertyType, Option[]> = {
  APARTMENT: [
    { value: "35", label: "Từ 35 m²" },
    { value: "50", label: "Từ 50 m²" },
    { value: "70", label: "Từ 70 m²" },
    { value: "90", label: "Từ 90 m²" },
  ],
  HOUSE: [
    { value: "40", label: "Từ 40 m²" },
    { value: "60", label: "Từ 60 m²" },
    { value: "90", label: "Từ 90 m²" },
    { value: "120", label: "Từ 120 m²" },
  ],
  LAND: [
    { value: "60", label: "Từ 60 m²" },
    { value: "100", label: "Từ 100 m²" },
    { value: "200", label: "Từ 200 m²" },
    { value: "500", label: "Từ 500 m²" },
  ],
  ROOM: [
    { value: "12", label: "Từ 12 m²" },
    { value: "18", label: "Từ 18 m²" },
    { value: "25", label: "Từ 25 m²" },
    { value: "35", label: "Từ 35 m²" },
  ],
  VILLA: [
    { value: "120", label: "Từ 120 m²" },
    { value: "200", label: "Từ 200 m²" },
    { value: "300", label: "Từ 300 m²" },
    { value: "500", label: "Từ 500 m²" },
  ],
  OFFICE: [
    { value: "50", label: "Từ 50 m²" },
    { value: "100", label: "Từ 100 m²" },
    { value: "200", label: "Từ 200 m²" },
    { value: "500", label: "Từ 500 m²" },
  ],
  SHOPHOUSE: [
    { value: "60", label: "Từ 60 m²" },
    { value: "100", label: "Từ 100 m²" },
    { value: "150", label: "Từ 150 m²" },
    { value: "250", label: "Từ 250 m²" },
  ],
  WAREHOUSE: [
    { value: "200", label: "Từ 200 m²" },
    { value: "500", label: "Từ 500 m²" },
    { value: "1000", label: "Từ 1.000 m²" },
    { value: "2000", label: "Từ 2.000 m²" },
  ],
};


export function HomeSearchForm({
  popularLocations,
}: {
  popularLocations: PopularLocation[];
}) {
  const [propertyType, setPropertyType] = useState<"" | PropertyType>("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");

  const propertyTypeOptions = useMemo(
    () =>
      PROPERTY_TYPES.map((type) => ({
        value: type,
        label: propertyTypeLabels[type],
      })),
    [],
  );

  const priceOptions = useMemo(
    () => (propertyType ? propertyPriceOptions[propertyType] : defaultPriceOptions),
    [propertyType],
  );
  const areaOptions = useMemo(
    () => (propertyType ? propertyAreaOptions[propertyType] : defaultAreaOptions),
    [propertyType],
  );

  const handlePropertyTypeChange = (value: string) => {
    setPropertyType(value as "" | PropertyType);
    setMaxPrice("");
    setMinArea("");
  };

  return (
    <form
      action="/posts"
      onSubmit={() => {
        try {
          sessionStorage.removeItem("posts_page_state");
        } catch (e) {}
      }}
      className="mt-7 w-full max-w-[1360px] rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-[1.15fr_1fr_1fr_1fr_auto]">
        <div className="col-span-2 md:col-span-1">
          <CitySelect />
        </div>

        <div className="col-span-2 md:col-span-1">
          <HomeSearchSelect
            icon={Home}
            label="Loại bất động sản"
            name="propertyType"
            value={propertyType}
            onChange={handlePropertyTypeChange}
            options={propertyTypeOptions}
            placeholder="Chọn loại"
          />
        </div>

        <div className="col-span-1">
          <HomeSearchSelect
            icon={SlidersHorizontal}
            label={propertyType === "ROOM" ? "Khoảng giá thuê" : "Khoảng giá"}
            name="maxPrice"
            value={maxPrice}
            onChange={setMaxPrice}
            options={priceOptions}
            placeholder={propertyType === "ROOM" ? "Chọn khoảng giá thuê" : "Chọn khoảng giá"}
          />
        </div>

        <div className="col-span-1">
          <HomeSearchSelect
            icon={Ruler}
            label="Diện tích"
            name="minArea"
            value={minArea}
            onChange={setMinArea}
            options={areaOptions}
            placeholder="Chọn diện tích"
          />
        </div>

        <button
          type="submit"
          className="btn-primary col-span-2 inline-flex min-h-16 items-center justify-center gap-2 rounded-xl px-8 md:col-span-full lg:col-span-1"
        >
          <Search className="h-5 w-5" />
          Tìm kiếm
        </button>
      </div>

      {popularLocations.length > 0 ? (
        <div className="mt-5 hidden md:flex max-h-20 flex-wrap items-center gap-3 overflow-hidden text-sm">
          <span className="text-gray-300">Tìm kiếm phổ biến:</span>
          {popularLocations.map((item) => (
            <Link
              key={item.city}
              href={`/posts?city=${encodeURIComponent(item.city)}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-gray-200 transition hover:bg-white/10"
            >
              {item.city}
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}
