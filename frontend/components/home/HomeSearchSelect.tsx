"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, type LucideIcon } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface HomeSearchSelectProps {
  icon: LucideIcon;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}

export function HomeSearchSelect({
  icon: Icon,
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}: HomeSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onChange("");
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={rootRef}>
      <input type="hidden" name={name} value={value} />

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
        className="flex min-h-16 items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-2.5 sm:px-4 transition hover:bg-white/10 cursor-pointer select-none text-left w-full outline-none focus-within:border-blue-400/40"
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-gray-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] sm:text-xs text-gray-400">{label}</span>
          <span className="mt-1 block text-xs sm:text-sm font-medium text-white truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <span className="flex items-center gap-1 shrink-0 ml-1">
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              className="theme-button-ghost rounded-full p-0.5"
              aria-label="Xóa lựa chọn"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}

          <ChevronDown
            className={`theme-text-muted h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>

      {isOpen && dropdownStyle
        ? createPortal(
            <div
              ref={dropdownRef}
              className="theme-popover fixed z-[1200] min-w-[200px] overflow-hidden rounded-xl p-2"
              style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
              }}
            >
              <div className="custom-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    !value
                      ? "theme-button-info font-semibold"
                      : "theme-text-secondary hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {placeholder}
                </button>
                {options.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "theme-button-info font-semibold"
                          : "theme-text-secondary hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}

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
              background: color-mix(in srgb, var(--foreground) 18%, transparent);
              border-radius: 9px;
            }
          `,
        }}
      />
    </div>
  );
}
