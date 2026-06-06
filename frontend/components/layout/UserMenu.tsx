"use client";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";
import {
  Bookmark,
  LayoutDashboard,
  List,
  LogOut,
  Monitor,
  Moon,
  Sun,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "default", label: "Mặc định", icon: Monitor },
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
];

export function UserMenu() {
  const { user, refreshToken, logout } = useAuthStore();
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return <Link href="/auth/login" className="btn-primary">Đăng nhập</Link>;
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Always clear local auth state even if revoke fails.
    } finally {
      logout();
      setIsOpen(false);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative z-[130]" ref={menuRef}>
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl border border-transparent p-2 text-[var(--foreground)] transition-colors hover:border-[var(--border)] hover:bg-[var(--hover)]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="hidden font-medium md:block">{user.name}</span>
      </button>

      {isOpen ? (
        <div className="theme-popover absolute right-0 top-full z-[140] mt-2 w-72 overflow-visible rounded-2xl py-2">
          <Link
            href="/profile"
            className="theme-dropdown-item flex items-center gap-3 px-4 py-2 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <UserIcon size={16} />
            <span>Hồ sơ</span>
          </Link>
          <Link
            href="/profile/posts"
            className="theme-dropdown-item flex items-center gap-3 px-4 py-2 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <List size={16} />
            <span>Bài đăng của tôi</span>
          </Link>
          <Link
            href="/profile/saved"
            className="theme-dropdown-item flex items-center gap-3 px-4 py-2 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Bookmark size={16} />
            <span>Bài đăng đã lưu</span>
          </Link>
          {user.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="theme-dropdown-item flex items-center gap-3 px-4 py-2 text-[var(--accent)] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard size={16} />
              <span>Quản trị</span>
            </Link>
          ) : null}

          <div className="theme-divider my-2 h-px" />

          <div className="px-4 pb-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">
                Chủ đề
              </span>
              <span className="text-xs text-[var(--muted)]">
                {themePreference === "default"
                  ? `Mặc định · ${resolvedTheme === "dark" ? "tối" : "sáng"}`
                  : resolvedTheme === "dark"
                    ? "tối"
                    : "sáng"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const selected = themePreference === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setThemePreference(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? "theme-usermenu-option-active"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span className="mb-1 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="block text-center text-xs font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="theme-divider my-2 h-px" />

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-[var(--badge-danger-text)] transition-colors hover:bg-[var(--badge-danger-bg)]"
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
