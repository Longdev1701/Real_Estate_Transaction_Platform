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
  LogIn,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function UserMenu() {
  const { user, logout, hasHydrated, isLoadingUser } = useAuthStore();
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

  if (!hasHydrated || isLoadingUser) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-xl bg-[var(--border)]" />
    );
  }

  if (!user) {
    return (
      <Link href="/auth/login" prefetch={true} className="btn-primary flex items-center justify-center p-2 sm:px-4">
        <LogIn className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await api.post("/auth/logout");
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
        type="button"
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

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="theme-popover absolute right-0 top-full z-[140] mt-2 w-60 flex flex-col overflow-hidden rounded-2xl py-2 shadow-lg origin-top-right"
          >
            <Link
              href="/profile/posts"
              className="theme-dropdown-item flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-muted)]"
              onClick={() => setIsOpen(false)}
            >
              <UserIcon size={16} />
              <span>Hồ sơ</span>
            </Link>

            <Link
              href="/profile/saved"
              className="theme-dropdown-item flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-muted)]"
              onClick={() => setIsOpen(false)}
            >
              <Bookmark size={16} />
              <span>Bài đăng đã lưu</span>
            </Link>
            {user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="theme-dropdown-item flex items-center gap-3 px-4 py-2.5 text-[var(--accent)] transition-colors hover:bg-[var(--surface-muted)]"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard size={16} />
                <span>Quản trị</span>
              </Link>
            ) : null}

            <div className="theme-divider my-2 h-px" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[var(--badge-danger-text)] transition-colors hover:bg-[var(--badge-danger-bg)]"
            >
              <LogOut size={16} />
              <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
