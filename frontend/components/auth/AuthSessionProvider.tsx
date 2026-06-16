"use client";

import { useEffect, useRef, useState } from "react";

import { api, refreshAuthSession } from "@/lib/api";
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

const TOKEN_REFRESH_BUFFER_SECONDS = 60;

const getTokenExpiresAt = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const base64Payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = base64Payload.padEnd(base64Payload.length + ((4 - (base64Payload.length % 4)) % 4), "=");
    const decodedPayload = JSON.parse(window.atob(paddedPayload)) as {
      exp?: number;
    };

    return typeof decodedPayload.exp === "number" ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const shouldRefreshToken = (token: string) => {
  const expiresAt = getTokenExpiresAt(token);
  return !expiresAt || expiresAt - Date.now() <= TOKEN_REFRESH_BUFFER_SECONDS * 1000;
};

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const {
    accessToken,
    hasHydrated,
    user,
    setUser,
    setIsLoadingUser,
    logout,
  } = useAuthStore();
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!hasHydrated || hasChecked.current) {
      return;
    }

    let isMounted = true;
    hasChecked.current = true;

    const restoreSession = async () => {
      try {
        const cachedUser = useAuthStore.getState().user;
        setIsLoadingUser(!cachedUser);

        const currentToken = useAuthStore.getState().accessToken;
        if (!currentToken) {
          if (!cachedUser) {
            setIsSessionVerified(false);
            return;
          }

          const session = await refreshAuthSession();
          if (!isMounted) return;

          setUser(normalizeUser(session.user));
          setIsSessionVerified(true);
          return;
        }

        if (shouldRefreshToken(currentToken)) {
          const session = await refreshAuthSession();
          if (!isMounted) return;

          setUser(normalizeUser(session.user));
          setIsSessionVerified(true);
          return;
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
  }, [hasHydrated, logout, setIsLoadingUser, setUser]);

  useEffect(() => {
    if (accessToken && user) {
      setIsSessionVerified(true);
    }
  }, [accessToken, user]);

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
