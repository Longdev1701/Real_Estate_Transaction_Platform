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
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  hasHydrated: boolean;
  isLoadingUser: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
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
      setAuth: (user, token) => set({ user, accessToken: token }),
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setIsLoadingUser: (isLoadingUser) => set({ isLoadingUser }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
