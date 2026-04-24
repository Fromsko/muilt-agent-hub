import { useAuthStore } from '@/stores/auth';

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions.includes(permission);
}

export function usePermissions(required: string[], mode: 'any' | 'all' = 'any'): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return mode === 'all'
    ? required.every((p) => permissions.includes(p))
    : required.some((p) => permissions.includes(p));
}
