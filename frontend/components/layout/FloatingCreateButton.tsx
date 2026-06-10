"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

export function FloatingCreateButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (
    pathname === "/posts" ||
    pathname === "/posts/create" ||
    pathname?.startsWith("/messages") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/profile")
  ) {
    return null;
  }

  const handleClick = () => {
    if (user) {
      router.push("/posts/create");
    } else {
      router.push("/auth/login");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="theme-floating-action group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center md:bottom-8 md:right-8"
      aria-label={"T\u1ea1o b\u00e0i \u0111\u0103ng"}
    >
      <Plus size={28} className="transition-transform duration-300 group-hover:rotate-90" />
    </button>
  );
}
