"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface Province {
  code: number;
  name: string;
}

export function CitySelect() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<Province | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://production.cas.so/address-kit/2025-07-01/provinces");
        const payload = await response.json();
        if (payload && Array.isArray(payload.provinces)) {
          const list = payload.provinces.map((p: any) => ({
            code: p.code,
            name: p.name,
          }));
          // Sort alphabetically
          list.sort((a: Province, b: Province) => a.name.localeCompare(b.name, "vi"));
          setProvinces(list);
        }
      } catch (err) {
        console.error("Failed to load provinces:", err);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered provinces list based on input search
  const filteredProvinces = provinces.filter((province) =>
    province.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cleanName = (fullName: string) => {
    return fullName.replace(/^(Thành phố|Tỉnh)\s+/i, "");
  };

  const handleSelect = (province: Province) => {
    setSelectedCity(province);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCity(null);
    setSearchQuery("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input to submit the exact value inside form */}
      <input type="hidden" name="city" value={selectedCity ? selectedCity.name : ""} />

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="mt-1 flex w-full items-center justify-between bg-transparent text-sm font-medium text-white outline-none cursor-pointer select-none"
      >
        <span className="truncate">
          {selectedCity ? cleanName(selectedCity.name) : "Tất cả vị trí"}
        </span>
        <div className="flex items-center gap-1">
          {selectedCity && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Custom Dropdown list */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2.5 w-full min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
          {/* Live search input */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tỉnh/thành..."
              className="w-full text-xs rounded-lg border border-white/5 bg-slate-900/60 py-1.5 pl-8 pr-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* List items container with max-height and custom scrollbar */}
          <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar space-y-0.5">
            {filteredProvinces.length === 0 ? (
              <p className="p-2 text-center text-xs text-gray-500">Không tìm thấy vị trí</p>
            ) : (
              filteredProvinces.map((province) => {
                const isSelected = selectedCity?.code === province.code;
                return (
                  <button
                    key={province.code}
                    type="button"
                    onClick={() => handleSelect(province)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                      isSelected
                        ? "bg-blue-600/25 text-blue-300 font-semibold"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {cleanName(province.name)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 3.5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 9px;
        }
      ` }} />
    </div>
  );
}
