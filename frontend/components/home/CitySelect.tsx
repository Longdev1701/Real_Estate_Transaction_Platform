"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

interface Province {
  code: number;
  name: string;
}

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const cleanName = (fullName: string) =>
  fullName.replace(/^(Thành phố|Tỉnh)\s+/i, "");

export function CitySelect() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState<number | null>(null);
  const [selectedCityName, setSelectedCityName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch("https://production.cas.so/address-kit/2025-07-01/provinces");
        const payload = await response.json();
        if (payload && Array.isArray(payload.provinces)) {
          const list = payload.provinces.map((province: any) => ({
            code: province.code,
            name: String(province.name).replace(/\n/g, "").trim(),
          }));
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

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownStyle({
        top: rect.bottom + 10,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const filteredProvinces = provinces.filter((province) =>
    normalizeSearchText(province.name).includes(normalizeSearchText(searchQuery)),
  );

  const handleSelect = (province: Province) => {
    setSelectedCityCode(province.code);
    setSelectedCityName(province.name);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setSelectedCityCode(null);
    setSelectedCityName("");
    setSearchQuery("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input type="hidden" name="city" value={selectedCityName} />

      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((current) => !current);
          }
        }}
        className="mt-1 flex w-full cursor-pointer items-center justify-between bg-transparent text-sm font-medium text-white outline-none"
      >
        <span className="truncate">
          {selectedCityName ? cleanName(selectedCityName) : "Tất cả vị trí"}
        </span>
        <span className="flex items-center gap-1">
          {selectedCityName ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-0.5 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Xóa vị trí đã chọn"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>

      {isOpen && dropdownStyle
        ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[1200] min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-slate-950 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)]"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
          }}
        >
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tỉnh/thành..."
              className="w-full rounded-lg border border-white/5 bg-slate-900/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              onClick={(event) => event.stopPropagation()}
            />
          </div>

          <div className="custom-scrollbar max-h-40 space-y-0.5 overflow-y-auto pr-1">
            {filteredProvinces.length === 0 ? (
              <p className="p-2 text-center text-xs text-gray-500">Không tìm thấy vị trí</p>
            ) : (
              filteredProvinces.map((province) => {
                const isSelected = selectedCityCode === province.code;
                return (
                  <button
                    key={province.code}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(province)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-600/25 font-semibold text-blue-300"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {cleanName(province.name)}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
    </div>
  );
}
