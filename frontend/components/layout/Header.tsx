"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Bookmark, MessageSquare } from "lucide-react";

import { api } from "@/lib/api";
import type { NotificationItem, NotificationListData } from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { UserMenu } from "./UserMenu";

export function Header() {
  const pathname = usePathname();
  const { user, hasHydrated } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
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

  useEffect(() => {
    const handleUnreadCountChanged = (event: Event) => {
      const nextCount = (event as CustomEvent<number>).detail;
      if (typeof nextCount === "number") {
        setUnreadNotifications(nextCount);
      }
    };

    window.addEventListener("notifications:unread-count", handleUnreadCountChanged);
    return () => {
      window.removeEventListener("notifications:unread-count", handleUnreadCountChanged);
    };
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotificationCreated = (notification: NotificationItem) => {
      if (notification.userId === user.id && !notification.isRead) {
        setUnreadNotifications((current) => current + 1);
      }
    };

    socket.on("notification_created", handleNotificationCreated);

    return () => {
      socket.off("notification_created", handleNotificationCreated);
    };
  }, [socket, user]);

  if (pathname?.startsWith("/messages") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="fixed top-0 z-[120] w-full overflow-visible glass-panel">
      <div className="container mx-auto flex h-20 items-center justify-between overflow-visible px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-wider text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
              T
            </span>
            <span>TrustEstate</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-300 md:flex">
            <Link href="/" className="transition-colors hover:text-blue-400">
              Trang chủ
            </Link>
            <Link href="/posts" className="transition-colors hover:text-blue-400">
              Bài đăng
            </Link>
            <Link href="/compare" className="transition-colors hover:text-blue-400">
              So sánh
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
            + Đăng bài
          </Link>

          <div className="mx-2 h-8 w-px bg-white/10" />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
