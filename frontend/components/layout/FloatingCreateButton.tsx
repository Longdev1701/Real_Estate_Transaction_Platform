"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

export function FloatingCreateButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (pathname === "/posts" || pathname?.startsWith("/messages")) {
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
      className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300 hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] md:bottom-8 md:right-8"
      aria-label={"T\u1ea1o b\u00e0i \u0111\u0103ng"}
    >
      <Plus size={28} className="transition-transform duration-300 group-hover:rotate-90" />
    </button>
  );
}
