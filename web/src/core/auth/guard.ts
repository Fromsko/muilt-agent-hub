import { useAuthStore } from '@/stores/auth';
import { canAccessPath, normalizeAppPath } from '@/utils/app-menu';

export { normalizeAppPath };

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

export function checkAuth(locationPathname: string): {
  authenticated: boolean;
  hasPermission: boolean;
} {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated) return { authenticated: false, hasPermission: false };

  const path = normalizeAppPath(locationPathname);
  if (path === '/403') return { authenticated: true, hasPermission: true };

  const hasPermission = canAccessPath(locationPathname, user?.permissions);
  return { authenticated: true, hasPermission };
}
