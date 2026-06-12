import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  phone?: string | null;
  role?: string;
  status?: string;
  avatar?: string;
  avatarUrl?: string | null;
  address?: string | null;
  bio?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  isLoadingUser: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setIsLoadingUser: (isLoadingUser: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      isLoadingUser: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setIsLoadingUser: (isLoadingUser) => set({ isLoadingUser }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
