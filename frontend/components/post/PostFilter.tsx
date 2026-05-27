"use client";

import { ChevronDown, Filter, RotateCcw, Search } from "lucide-react";

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
          <h2 className="text-xl font-semibold text-white">Bo loc tim kiem</h2>
        </div>
        <button type="button" onClick={onReset} className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
          Dat lai
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Tu khoa</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={value.keyword}
              onChange={(event) => updateField("keyword", event.target.value)}
              className="input-dark pl-11"
              placeholder="Ten bai dang, dia chi..."
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Vi tri</label>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={value.city}
                onChange={(event) => updateField("city", event.target.value)}
                className="input-dark pr-10"
                placeholder="Chon tinh / thanh"
              />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={value.district}
                onChange={(event) => updateField("district", event.target.value)}
                className="input-dark pr-10"
                placeholder="Chon quan / huyen"
              />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">Loai bat dong san</label>
          <div className="relative">
            <select
              value={value.propertyType}
              onChange={(event) =>
                updateField("propertyType", event.target.value as PostFilterValue["propertyType"])
              }
              className="input-dark appearance-none pr-10"
            >
              <option value="">Chon loai</option>
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
          <label className="mb-2 block text-sm font-medium text-gray-200">Loai giao dich</label>
          <div className="relative">
            <select
              value={value.postType}
              onChange={(event) => updateField("postType", event.target.value as PostFilterValue["postType"])}
              className="input-dark appearance-none pr-10"
            >
              <option value="">Tat ca giao dich</option>
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
          <label className="mb-2 block text-sm font-medium text-gray-200">Khoang gia</label>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <input
              type="number"
              min="0"
              value={value.minPrice}
              onChange={(event) => updateField("minPrice", event.target.value)}
              className="input-dark"
              placeholder="Tu"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              value={value.maxPrice}
              onChange={(event) => updateField("maxPrice", event.target.value)}
              className="input-dark"
              placeholder="Den"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="btn-primary inline-flex items-center justify-center gap-2 py-3"
        >
          {isLoading ? "Dang tai..." : "Ap dung bo loc"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-200 transition hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          Xem them bo loc
        </button>
      </div>
    </section>
  );
}
