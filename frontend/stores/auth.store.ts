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
  hasHydrated: boolean;
  isLoadingUser: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setTokens: (accessToken: string) => void;
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
      hasHydrated: false,
      isLoadingUser: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      setTokens: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setIsLoadingUser: (isLoadingUser) => set({ isLoadingUser }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
