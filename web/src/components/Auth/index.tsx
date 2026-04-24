import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';

interface AuthProps {
  permission: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
  mode?: 'any' | 'all';
}

export function Auth({
  permission,
  fallback = null,
  children,
  mode = 'any',
}: AuthProps) {
  const permissions = useAuthStore((s) => s.permissions);
  const required = Array.isArray(permission) ? permission : [permission];
  const hasPermission =
    permissions.includes('*') ||
    (mode === 'all'
      ? required.every((p) => permissions.includes(p))
      : required.some((p) => permissions.includes(p)));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
