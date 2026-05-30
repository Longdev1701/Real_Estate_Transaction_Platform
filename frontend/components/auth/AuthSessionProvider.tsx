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
});

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, hasHydrated, user, setUser, setIsLoadingUser, logout } =
    useAuthStore();
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!accessToken) {
      setIsSessionVerified(false);
      setIsLoadingUser(false);
      return;
    }

    let isMounted = true;

    const restoreSession = async () => {
      try {
        setIsLoadingUser(!user);
        const response = await api.get("/auth/me");
        if (isMounted) {
          setUser(normalizeUser(response.data.data));
          setIsSessionVerified(true);
        }
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
  }, [accessToken, hasHydrated, logout, setIsLoadingUser, setUser]);

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
