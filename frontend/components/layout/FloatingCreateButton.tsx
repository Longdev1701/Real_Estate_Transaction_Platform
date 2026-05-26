"use client";

import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";

export function FloatingCreateButton() {
  const router = useRouter();
  const { user } = useAuthStore();

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
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all duration-300 z-50 group"
      aria-label="Tạo bài đăng"
    >
      <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
    </button>
  );
}
