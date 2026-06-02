"use client";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Bookmark, LayoutDashboard, List, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { user, refreshToken, logout } = useAuthStore();
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
    return (
      <Link href="/auth/login" className="btn-primary">
        Đăng nhập
      </Link>
    );
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-medium">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="hidden md:block font-medium">{user.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[140] mt-2 w-48 overflow-visible rounded-2xl border border-white/12 bg-slate-950/62 py-2 shadow-[0_20px_60px_rgba(2,6,23,0.42)] backdrop-blur-2xl">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <UserIcon size={16} />
            <span>Profile</span>
          </Link>
          <Link
            href="/profile/posts"
            className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <List size={16} />
            <span>My Posts</span>
          </Link>
          <Link
            href="/profile/saved"
            className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Bookmark size={16} />
            <span>Saved Posts</span>
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-blue-300"
              onClick={() => setIsOpen(false)}
            >
              <LayoutDashboard size={16} />
              <span>Admin</span>
            </Link>
          )}
          <div className="h-px bg-white/10 my-1"></div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
