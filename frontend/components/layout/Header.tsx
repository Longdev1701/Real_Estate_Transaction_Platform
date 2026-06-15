"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Bell, Bookmark, MessageCircle } from "lucide-react";

import { api } from "@/lib/api";
import type { NotificationItem, NotificationListData } from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Header() {
  const pathname = usePathname();
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 20);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial scroll

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!hasHydrated || isLoadingUser || !user || !accessToken) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    let isMounted = true;

    const fetchCounts = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          api.get<{ data: NotificationListData }>("/notifications?limit=1"),
          api.get<{ data: { unreadCount: number } }>("/conversations/unread-count"),
        ]);
        if (isMounted) {
          setUnreadNotifications(notifRes.data.data.unreadCount);
          setUnreadMessages(msgRes.data.data.unreadCount);
        }
      } catch {
        if (isMounted) {
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      }
    };

    fetchCounts();

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

    const pathnameRef = useRef(pathname);
    useEffect(() => {
      pathnameRef.current = pathname;
    }, [pathname]);

    useEffect(() => {
    if (!socket || !user) return;

    const handleNotificationCreated = (notification: NotificationItem) => {
      if (notification.userId === user.id && !notification.isRead) {
        setUnreadNotifications((current) => current + 1);
      }
    };

    const handleReceiveMessage = (message: any) => {
      if (message.senderId !== user.id) {
        // Play notification sound if not on messages page
        if (!pathnameRef.current?.startsWith("/messages")) {
          const audio = new Audio("/sounds/discord-new-notification.mp3");
          audio.play().catch((err) => console.error("Error playing audio:", err));
        }

        // Debounce or just fetch to get the correct number of unread conversations
        setTimeout(() => {
          api.get<{ data: { unreadCount: number } }>("/conversations/unread-count")
            .then((res) => setUnreadMessages(res.data.data.unreadCount))
            .catch(() => {});
        }, 500); // Wait a bit in case the active conversation marks it as read
      }
    };

    const handleMessagesRead = (data: { userId: string; count?: number }) => {
      if (data.userId !== user.id) return;
      api.get<{ data: { unreadCount: number } }>("/conversations/unread-count")
        .then((res) => setUnreadMessages(res.data.data.unreadCount))
        .catch(() => {});
    };

    socket.on("notification_created", handleNotificationCreated);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("notification_created", handleNotificationCreated);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket, user]);

  if (pathname?.startsWith("/messages") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className={`fixed top-0 z-[120] w-full overflow-visible transition-all duration-300 ${isScrolled ? "glass-panel border-b border-[var(--border)] shadow-sm" : "bg-transparent"}`}>
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
          <ThemeToggle />

          <Link href="/posts/create" className="btn-primary ml-2 hidden sm:block">
            + Đăng bài
          </Link>

          {!hasHydrated || isLoadingUser ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--border)]" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--border)] hidden md:block" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--border)] hidden md:block" />
              <div className="mx-2 hidden h-8 w-px bg-[var(--border)] md:block" />
              <div className="h-9 w-24 animate-pulse rounded-xl bg-[var(--border)]" />
            </div>
          ) : (
            <>
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
                className={`relative hidden md:flex rounded-xl p-2 transition-colors ${pathname === "/messages" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                  }`}
                aria-label="Tin nhắn"
              >
                <MessageCircle size={20} />
                {unreadMessages > 0 ? (
                  <span className="theme-header-notification-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </Link>

              <Link
                href={user ? "/profile/saved" : "/auth/login"}
                className="hidden md:flex rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                aria-label="Bài đăng đã lưu"
              >
                <Bookmark size={20} />
              </Link>

              <div className="mx-2 hidden h-8 w-px bg-[var(--border)] md:block" />

              <UserMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
