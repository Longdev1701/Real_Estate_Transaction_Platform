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
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!hasHydrated || isLoadingUser || !user || !accessToken) {
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
  }, [accessToken, hasHydrated, isLoadingUser, userId]);

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
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-wider text-[var(--foreground)]">
            <span className="theme-header-brand flex h-8 w-8 items-center justify-center rounded-lg">
              T
            </span>
            Trust<span className="text-[var(--accent)]">Estate</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted-foreground)] md:flex">
            <Link href="/" className="transition-colors hover:text-[var(--foreground)]">
              Trang chủ
            </Link>
            <Link href="/posts" className="transition-colors hover:text-[var(--foreground)]">
              Bài đăng
            </Link>
            <Link href="/compare" className="transition-colors hover:text-[var(--foreground)]">
              So sánh
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={user ? "/notifications" : "/auth/login"}
            className={`relative rounded-xl p-2 transition-colors ${pathname === "/notifications" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
              }`}
            aria-label="Thông báo"
          >
            <Bell size={20} />
            {unreadNotifications > 0 ? (
              <span className="theme-header-notification-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
            {pathname === "/notifications" ? (
              <span className="theme-header-active-indicator absolute inset-x-1 -bottom-5 h-1 rounded-full" />
            ) : null}
          </Link>

          <Link
            href="/messages"
            className="relative rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            aria-label="Tin nhắn"
          >
            <MessageSquare size={20} />
          </Link>

          <Link
            href={user ? "/profile/saved" : "/auth/login"}
            className="rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            aria-label="Bài đăng đã lưu"
          >
            <Bookmark size={20} />
          </Link>

          <Link href="/posts/create" className="btn-primary ml-2 hidden sm:block">
            + Đăng bài
          </Link>

          <div className="mx-2 h-8 w-px bg-[var(--border)]" />

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
