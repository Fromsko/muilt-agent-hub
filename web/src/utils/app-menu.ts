interface AppMenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  permissions?: string[];
  children?: AppMenuItem[];
}

export const APP_MENU_TREE: AppMenuItem[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: 'LayoutDashboard',
    path: '/dashboard',
  },
  {
    key: 'agents',
    label: '智能体',
    icon: 'Bot',
    path: '/agents',
  },
  {
    key: 'prompts',
    label: '提示词',
    icon: 'FileText',
    path: '/prompts',
  },
  {
    key: 'keys',
    label: '模型密钥',
    icon: 'KeyRound',
    path: '/keys',
  },
  {
    key: 'api-tokens',
    label: 'API Token',
    icon: 'Ticket',
    path: '/api-tokens',
  },
  {
    key: 'mcp-servers',
    label: 'MCP 工具',
    icon: 'Wrench',
    path: '/mcp-servers',
  },
  {
    key: 'open-keys',
    label: '开放密钥',
    icon: 'Share2',
    path: '/open-keys',
    permissions: ['superuser'],
  },
  {
    key: 'logs',
    label: '系统日志',
    icon: 'ScrollText',
    path: '/logs',
  },
  {
    key: 'users',
    label: '用户管理',
    icon: 'Users',
    path: '/users',
    permissions: ['superuser'],
  },
  {
    key: 'settings',
    label: '设置',
    icon: 'Settings',
    path: '/settings',
  },
];

export function filterMenuTreeByPermissions(
  tree: AppMenuItem[],
  permissions: string[],
): AppMenuItem[] {
  return tree
    .map((item) => {
      if (item.children) {
        const filteredChildren = filterMenuTreeByPermissions(item.children, permissions);
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      if (item.permissions && item.permissions.length > 0) {
        const hasPermission = permissions.includes('*') || item.permissions.some((p) => permissions.includes(p));
        if (!hasPermission) return null;
      }
      return item;
    })
    .filter(Boolean) as AppMenuItem[];
}

function collectPathPermissions(tree: AppMenuItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  function walk(items: AppMenuItem[]) {
    for (const item of items) {
      if (item.path && item.permissions) {
        map.set(normalizeAppPath(item.path), item.permissions);
      }
      if (item.children) walk(item.children);
    }
  }
  walk(tree);
  return map;
}

export function normalizeAppPath(pathname: string): string {
  return pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
}

export function canAccessPath(pathname: string, permissions?: string[]): boolean {
  if (!permissions) return false;
  const pathPermMap = collectPathPermissions(APP_MENU_TREE);
  const normalized = normalizeAppPath(pathname);
  const required = pathPermMap.get(normalized);
  if (!required || required.length === 0) return true;
  return permissions.includes('*') || required.some((p) => permissions.includes(p));
}
