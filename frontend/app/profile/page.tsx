"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, user, router]);

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="glass-card p-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Hồ sơ cá nhân</h1>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center text-2xl font-bold text-blue-400 border border-blue-500/50">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
