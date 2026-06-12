"use client";

import { useEffect, useState } from "react";

import { api, refreshAccessToken } from "@/lib/api";
import { useAuthStore, type User } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";

type BackendUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role?: string;
  status?: string;
  avatarUrl?: string | null;
  address?: string | null;
  bio?: string | null;
};

export const normalizeUser = (user: BackendUser): User => ({
  id: user.id,
  email: user.email,
  name: user.fullName,
  fullName: user.fullName,
  phone: user.phone,
  role: user.role,
  status: user.status,
  avatar: user.avatarUrl ?? undefined,
  avatarUrl: user.avatarUrl,
  address: user.address,
  bio: user.bio,
});

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const {
    accessToken,
    hasHydrated,
    user,
    setUser,
    setTokens,
    setIsLoadingUser,
    logout,
  } = useAuthStore();
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!hasHydrated || hasChecked) {
      return;
    }

    let isMounted = true;
    setHasChecked(true);

    const restoreSession = async () => {
      try {
        setIsLoadingUser(true);

        let currentToken = useAuthStore.getState().accessToken;
        if (!currentToken) {
          currentToken = await refreshAccessToken();
        }

        const response = await api.get("/auth/me");
        if (!isMounted) return;

        const nextUser = normalizeUser(response.data.data);
        setUser(nextUser);
        setIsSessionVerified(true);
      } catch {
        if (isMounted) {
          setIsSessionVerified(false);
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, hasChecked, logout, setIsLoadingUser, setTokens, setUser]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (accessToken && user && isSessionVerified) {
      useSocketStore.getState().connect();
      return;
    }

    useSocketStore.getState().disconnect();
  }, [accessToken, hasHydrated, isSessionVerified, user]);

  return children;
}
