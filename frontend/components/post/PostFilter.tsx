"use client";

import { ChevronDown, Filter, Search } from "lucide-react";

import {
  POST_TYPES,
  PROPERTY_TYPES,
  postTypeLabels,
  propertyTypeLabels,
  type PostFilterValue,
} from "@/lib/posts";

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
  const updateField = <K extends keyof PostFilterValue>(key: K, fieldValue: PostFilterValue[K]) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <section className="glass-card p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-300">
            <Filter className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-white">{"B\u1ed9 l\u1ecdc t\u00ecm ki\u1ebfm"}</h2>
        </div>
        <button type="button" onClick={onReset} className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
          {"\u0110\u1eb7t l\u1ea1i"}
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">{"T\u1eeb kh\u00f3a"}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={value.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              className="input-dark pl-11"
              placeholder={"T\u00ean b\u00e0i \u0111\u0103ng, \u0111\u1ecba ch\u1ec9..."}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">{"V\u1ecb tr\u00ed"}</label>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={value.city}
                onChange={(event) => updateField("city", event.target.value)}
                className="input-dark pr-10"
                placeholder={"Ch\u1ecdn t\u1ec9nh / th\u00e0nh ph\u1ed1"}
              />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={value.district}
                onChange={(event) => updateField("district", event.target.value)}
                className="input-dark pr-10"
                placeholder={"Ch\u1ecdn qu\u1eadn / huy\u1ec7n"}
              />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">{"Lo\u1ea1i b\u1ea5t \u0111\u1ed9ng s\u1ea3n"}</label>
          <div className="relative">
            <select
              value={value.propertyType}
              onChange={(event) =>
                updateField("propertyType", event.target.value as PostFilterValue["propertyType"])
              }
              className="input-dark appearance-none pr-10"
            >
              <option value="">{"Ch\u1ecdn lo\u1ea1i"}</option>
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
          <label className="mb-2 block text-sm font-medium text-gray-200">{"Lo\u1ea1i giao d\u1ecbch"}</label>
          <div className="relative">
            <select
              value={value.postType}
              onChange={(event) => updateField("postType", event.target.value as PostFilterValue["postType"])}
              className="input-dark appearance-none pr-10"
            >
              <option value="">{"T\u1ea5t c\u1ea3 giao d\u1ecbch"}</option>
              {POST_TYPES.map((postType) => (
                <option key={postType} value={postType}>
                  {postTypeLabels[postType]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">{"Kho\u1ea3ng gi\u00e1"}</label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <input
              type="number"
              min="0"
              value={value.minPrice}
              onChange={(event) => updateField("minPrice", event.target.value)}
              className="input-dark"
              placeholder={"T\u1eeb"}
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              value={value.maxPrice}
              onChange={(event) => updateField("maxPrice", event.target.value)}
              className="input-dark"
              placeholder={"\u0110\u1ebfn"}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">{"Di\u1ec7n t\u00edch"}</label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <input
              type="number"
              min="0"
              value={value.minArea}
              onChange={(event) => updateField("minArea", event.target.value)}
              className="input-dark"
              placeholder={"T\u1eeb"}
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              value={value.maxArea}
              onChange={(event) => updateField("maxArea", event.target.value)}
              className="input-dark"
              placeholder={"\u0110\u1ebfn"}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3"
        >
          {isLoading ? "\u0110ang t\u1ea3i..." : "\u00c1p d\u1ee5ng b\u1ed9 l\u1ecdc"}
        </button>
      </div>
    </section>
  );
}
