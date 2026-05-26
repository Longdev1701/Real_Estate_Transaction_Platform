"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CreatePostPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="glass-card p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Đăng tin mới</h1>
        <p className="text-gray-400">Form đăng tin sẽ được tích hợp tại đây.</p>
      </div>
    </div>
  );
}
