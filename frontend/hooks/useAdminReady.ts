"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth.store";

export function useAdminAccessState() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();

  const isChecking =
    !hasHydrated || isLoadingUser || (Boolean(accessToken) && !user);
  const isReady =
    hasHydrated &&
    !isLoadingUser &&
    Boolean(accessToken) &&
    Boolean(user) &&
    user?.role === "ADMIN";

  return {
    user,
    accessToken,
    isChecking,
    isReady,
  };
}

export function useAdminReady() {
  const router = useRouter();
  const accessState = useAdminAccessState();
  const { user, accessToken, isChecking } = accessState;

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (!accessToken || !user) {
      router.replace("/auth/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [accessToken, isChecking, router, user]);

  return accessState;
}
