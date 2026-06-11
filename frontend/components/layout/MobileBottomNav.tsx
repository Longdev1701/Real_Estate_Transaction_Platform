"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

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
      label: "Tìm kiếm",
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
      href: user ? "/profile" : "/auth/login",
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
            className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
              item.isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <item.icon size={22} className={item.isActive ? "fill-[var(--primary)] text-[var(--primary)]" : ""} />
            <span className="text-[10px] font-medium">{item.label}</span>
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
            className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
              item.isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <item.icon size={22} className={item.isActive ? "fill-[var(--primary)] text-[var(--primary)]" : ""} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
      </div>
    </>
  );
}
