import { useAuthStore } from '@/stores/auth';

export function hasPermission(permission: string): boolean {
  const { permissions } = useAuthStore.getState();
  return permissions.includes(permission);
}

export function hasAnyPermission(requiredPermissions: string[]): boolean {
  const { permissions } = useAuthStore.getState();
  return requiredPermissions.some((p) => permissions.includes(p));
}

export function hasAllPermissions(requiredPermissions: string[]): boolean {
  const { permissions } = useAuthStore.getState();
  return requiredPermissions.every((p) => permissions.includes(p));
}

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions.includes(permission);
}
