import { authApi } from '@/api/auth';
import { createLogger } from '@/core/logger';
import { useAuthStore } from '@/stores/auth';
import { APP_MENU_TREE, filterMenuTreeByPermissions } from '@/utils/app-menu';

const log = createLogger('auth');

export async function fetchSessionAndApplyToStore(): Promise<void> {
  try {
    const [user, permissions] = await Promise.all([
      authApi.getUser(),
      authApi.getPermissions(),
    ]);

    const store = useAuthStore.getState();
    store.setUser(user);
    store.setPermissions(permissions);
    store.setMenus(filterMenuTreeByPermissions(APP_MENU_TREE, permissions));

    log.info('Session restored', { userId: user.id, permissionCount: permissions.length });
  } catch (error) {
    log.error('Failed to restore session', error);
    useAuthStore.getState().logout();
    throw error;
  }
}

export async function rehydrateAuth(): Promise<void> {
  await useAuthStore.persist.rehydrate();

  const { isAuthenticated } = useAuthStore.getState();
  if (isAuthenticated) {
    try {
      await fetchSessionAndApplyToStore();
    } catch {}
  }
}
