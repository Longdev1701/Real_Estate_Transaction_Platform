"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunMoon;
}> = [
  { value: "default", label: "Mặc định", icon: SunMoon },
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
];

const getActiveIcon = (themePreference: ThemePreference) => {
  if (themePreference === "light") return Sun;
  if (themePreference === "dark") return Moon;
  return SunMoon;
};

export function ThemeToggle() {
  const { themePreference, setThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const ActiveIcon = getActiveIcon(themePreference);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-[130]" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
        aria-label="Chọn chế độ nền"
      >
        <ActiveIcon size={20} />
      </button>

      {isOpen ? (
        <div className="theme-popover absolute right-0 top-full z-[140] mt-2 w-44 rounded-2xl p-2">
          <div className="grid gap-1">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = themePreference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setThemePreference(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    selected
                      ? "theme-usermenu-option-active"
                      : "text-[var(--secondary-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
