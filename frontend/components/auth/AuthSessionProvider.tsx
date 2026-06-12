"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
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
    refreshToken,
    hasHydrated,
    user,
    setUser,
    setTokens,
    setIsLoadingUser,
    logout,
  } =
    useAuthStore();
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!refreshToken) {
      setIsSessionVerified(false);
      setIsLoadingUser(false);
      if (user) {
        logout();
      }
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      try {
        setIsLoadingUser(!user);
        if (!accessToken) {
          const refreshResponse = await api.post("/auth/refresh-token", {
            refreshToken,
          });
          const tokens = refreshResponse.data.data as {
            accessToken: string;
            refreshToken: string;
          };
          if (!isMounted) return;
          setTokens(tokens.accessToken, tokens.refreshToken);
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
  }, [accessToken, hasHydrated, logout, refreshToken, setIsLoadingUser, setTokens, setUser, userId]);

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
