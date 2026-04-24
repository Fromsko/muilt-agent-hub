import { createPersistentStore } from './createPersistentStore';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  permissions: string[];
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  permissions?: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  user: User | null;
  menus: MenuItem[];
  permissions: string[];

  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setMenus: (menus: MenuItem[]) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = createPersistentStore<AuthState>(
  (set) => ({
    tokens: null,
    isAuthenticated: false,
    user: null,
    menus: [],
    permissions: [],

    setTokens: (tokens) => set({ tokens, isAuthenticated: true }),
    setUser: (user) => set({ user }),
    setMenus: (menus) => set({ menus }),
    setPermissions: (permissions) => set({ permissions }),
    logout: () =>
      set({
        tokens: null,
        isAuthenticated: false,
        user: null,
        menus: [],
        permissions: [],
      }),
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      tokens: state.tokens,
      isAuthenticated: state.isAuthenticated,
    }),
    merge: (persisted, current) => ({
      ...current,
      ...(persisted as Partial<AuthState>),
      user: null,
      menus: [],
      permissions: [],
    }),
  },
);
