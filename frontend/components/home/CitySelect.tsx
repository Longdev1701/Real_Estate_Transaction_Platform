"use client";

import { useEffect, useState } from "react";

export function CitySelect() {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch("https://provinces.open-api.vn/api/?depth=1");
        const data = await response.json();
        if (Array.isArray(data)) {
          // Normalize names by removing "Thành phố" or "Tỉnh" prefixes for clean searching
          const normalized = data.map((item: any) => {
            return item.name.replace(/^(Thành phố|Tỉnh)\s+/i, "");
          });
          // Sort alphabetically in Vietnamese
          normalized.sort((a, b) => a.localeCompare(b, "vi"));
          setCities(normalized);
        }
      } catch (e) {
        console.error("Failed to fetch provinces:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, []);

  return (
    <select
      name="city"
      className="hero-select mt-1 w-full bg-transparent text-sm font-medium text-white outline-none cursor-pointer"
      disabled={isLoading}
    >
      <option value="">{isLoading ? "Đang tải vị trí..." : "Tất cả vị trí"}</option>
      {cities.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
