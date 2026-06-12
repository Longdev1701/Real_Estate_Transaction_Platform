"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasHydrated, isLoadingUser, accessToken } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!hasHydrated || isLoadingUser || !user || !accessToken) {
      setUnreadMessages(0);
      return;
    }

    let isMounted = true;
    api.get<{ data: { unreadCount: number } }>("/conversations/unread-count")
      .then(res => {
        if (isMounted) setUnreadMessages(res.data.data.unreadCount);
      })
      .catch(() => {
        if (isMounted) setUnreadMessages(0);
      });

    return () => { isMounted = false; };
  }, [accessToken, hasHydrated, isLoadingUser, user]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (message: any) => {
      if (message.senderId !== user.id) {
        setTimeout(() => {
          api.get<{ data: { unreadCount: number } }>("/conversations/unread-count")
            .then((res) => setUnreadMessages(res.data.data.unreadCount))
            .catch(() => {});
        }, 500);
      }
    };

    const handleMessagesRead = (data: { userId: string; count?: number }) => {
      if (data.userId !== user.id) return;
      api.get<{ data: { unreadCount: number } }>("/conversations/unread-count")
        .then((res) => setUnreadMessages(res.data.data.unreadCount))
        .catch(() => {});
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket, user]);

  // Ẩn thanh bottom nav trên một số trang như messages/[id], admin, auth
  if (
    pathname?.startsWith("/messages/") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/auth") ||
    pathname === "/posts/create"
  ) {
    return null;
  }

  const handleCreatePost = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push("/posts/create");
    } else {
      router.push("/auth/login");
    }
  };

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Trang chủ",
      isActive: pathname === "/",
    },
    {
      href: "/posts",
      icon: Search,
      label: "Bản tin",
      isActive: pathname === "/posts",
    },
  ];

  const rightNavItems = [
    {
      href: user ? "/messages" : "/auth/login",
      icon: MessageCircle,
      label: "Tin nhắn",
      isActive: pathname?.startsWith("/messages"),
    },
    {
      href: user ? "/profile/posts" : "/auth/login",
      icon: User,
      label: "Hồ sơ",
      isActive: pathname?.startsWith("/profile"),
    },
  ];

  return (
    <>
      <div className="md:hidden h-[68px] w-full shrink-0" />
      <div className="md:hidden fixed bottom-0 left-0 z-[100] w-full border-t border-[var(--border)] bg-[var(--header)]/90 backdrop-blur-xl pb-safe">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative flex h-full w-16 flex-col items-center justify-center transition-all duration-300 active:scale-90 ${
              item.isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {/* Lớp nền trong suốt */}
            <div className={`absolute inset-x-0 inset-y-1.5 rounded-xl bg-[var(--primary)]/15 transition-all duration-300 ${item.isActive ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} />
            
            <div className="relative z-10 flex flex-col items-center justify-center">
              <item.icon size={22} className={`transition-all duration-300 ${item.isActive ? "scale-110 fill-[var(--primary)] text-[var(--primary)]" : "scale-100"}`} />
              <span className={`mt-1 text-[10px] font-medium transition-all duration-300 ${item.isActive ? "opacity-100" : "opacity-60"}`}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}

        <div className="relative -top-5 flex justify-center w-16">
          <button
            onClick={handleCreatePost}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--info)] text-white shadow-lg shadow-[var(--primary)]/40 transition-transform active:scale-95"
            aria-label="Đăng bài"
          >
            <Plus size={30} />
          </button>
        </div>

        {rightNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative flex h-full w-16 flex-col items-center justify-center transition-all duration-300 active:scale-90 ${
              item.isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {/* Lớp nền trong suốt */}
            <div className={`absolute inset-x-0 inset-y-1.5 rounded-xl bg-[var(--primary)]/15 transition-all duration-300 ${item.isActive ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} />

            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="relative">
                <item.icon size={22} className={`transition-all duration-300 ${item.isActive ? "scale-110 fill-[var(--primary)] text-[var(--primary)]" : "scale-100"}`} />
                {item.label === "Tin nhắn" && unreadMessages > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full border-2 border-[var(--header)] bg-[var(--accent)] px-1 text-[10px] font-bold leading-none text-[var(--primary-foreground)] shadow-sm">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </div>
              <span className={`mt-1 text-[10px] font-medium transition-all duration-300 ${item.isActive ? "opacity-100" : "opacity-60"}`}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </>
  );
}
