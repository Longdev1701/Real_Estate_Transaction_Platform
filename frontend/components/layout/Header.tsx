"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { UserMenu } from "./UserMenu";
import { Bell, Bookmark, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationListData } from "@/lib/notifications";

export function Header() {
  const pathname = usePathname();
  const { user, hasHydrated } = useAuthStore();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setUnreadNotifications(0);
      return;
    }

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get<{ data: NotificationListData }>("/notifications?limit=1");
        if (isMounted) {
          setUnreadNotifications(response.data.data.unreadCount);
        }
      } catch {
        if (isMounted) {
          setUnreadNotifications(0);
        }
      }
    };

    fetchUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, pathname, user]);

  if (pathname?.startsWith("/messages")) {
    return null;
  }

  return (
    <header className="fixed top-0 z-40 w-full glass-panel">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-wider text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              T
            </span>
            Trust<span className="text-blue-400">Estate</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-300 md:flex">
            <Link href="/" className="transition-colors hover:text-blue-400">
              {"Trang ch\u1ee7"}
            </Link>
            <Link href="/posts" className="transition-colors hover:text-blue-400">
              {"B\u00e0i \u0111\u0103ng"}
            </Link>
            <Link href="/compare" className="transition-colors hover:text-blue-400">
              {"So s\u00e1nh"}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={user ? "/notifications" : "/auth/login"}
            className={`relative p-2 transition-colors ${
              pathname === "/notifications" ? "text-blue-300" : "text-gray-400 hover:text-white"
            }`}
            aria-label="Thông báo"
          >
            <Bell size={20} />
            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white shadow-[0_0_14px_rgba(37,99,235,0.7)]">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
            {pathname === "/notifications" ? (
              <span className="absolute inset-x-1 -bottom-5 h-1 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(37,99,235,0.8)]" />
            ) : null}
          </Link>

          <Link href="/messages" className="relative p-2 text-gray-400 transition-colors hover:text-blue-400">
            <MessageSquare size={20} />
          </Link>

          <Link
            href={user ? "/profile/saved" : "/auth/login"}
            className="p-2 text-gray-400 transition-colors hover:text-blue-400"
          >
            <Bookmark size={20} />
          </Link>

          <Link href="/posts/create" className="btn-primary ml-2 hidden sm:block">
            {"+ \u0110\u0103ng b\u00e0i"}
          </Link>

          <div className="mx-2 h-8 w-px bg-white/10" />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
