"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { UserMenu } from "./UserMenu";
import { Bell, Bookmark, MessageSquare } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();

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
            <Link href="/projects" className="transition-colors hover:text-blue-400">
              {"D\u1ef1 \u00e1n"}
            </Link>
            <Link href="/compare" className="transition-colors hover:text-blue-400">
              {"So s\u00e1nh"}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 transition-colors hover:text-white">
            <Bell size={20} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
          </button>

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
