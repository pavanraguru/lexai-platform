// ============================================================
// LexAI India — Auth Store (Zustand)
// Global auth state: user, token, tenant
// ============================================================

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/lib/constants';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string;
  tenant_name: string;
  tenant_plan: string;
  avatar_url?: string;
  bar_enrollment_no?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser, token: string) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
  isAuthenticated: () => boolean;
  canRunAgents: () => boolean;
  canManageCases: () => boolean;
  canManageTeam: () => boolean;
  canViewBilling: () => boolean;
  canAccessPortal: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,

      setUser: (user, token) => set({ user, token, isLoading: false }),
      clearUser: () => set({ user: null, token: null }),
      setLoading: (v) => set({ isLoading: v }),

      isAuthenticated: () => !!get().token && !!get().user,

      // PRD v1.1 Section 6.2 — Role-Based Access Control
      canRunAgents: () => {
        const role = get().user?.role;
        return ['super_admin', 'managing_partner', 'senior_advocate', 'junior_associate'].includes(role || '');
      },
      canManageCases: () => {
        const role = get().user?.role;
        return ['super_admin', 'managing_partner', 'senior_advocate'].includes(role || '');
      },
      canManageTeam: () => {
        const role = get().user?.role;
        return ['super_admin', 'managing_partner'].includes(role || '');
      },
      canViewBilling: () => {
        const role = get().user?.role;
        return ['super_admin', 'managing_partner'].includes(role || '');
      },
      canAccessPortal: () => {
        return get().user?.role === 'client';
      },
    }),
    {
      name: 'lexai-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
