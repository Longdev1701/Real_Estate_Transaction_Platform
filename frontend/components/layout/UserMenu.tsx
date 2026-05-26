"use client";

import { useAuthStore } from "@/stores/auth.store";
import { LogOut, User as UserIcon, List } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative" ref={menuRef}>
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
        <div className="absolute right-0 mt-2 w-48 glass-card py-2 z-50">
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
          <div className="h-px bg-white/10 my-1"></div>
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
