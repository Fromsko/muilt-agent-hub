import type { MenuItem } from '@/stores/auth';
import { AppIcon } from '@/core/icons/registry';
import type { MenuProps } from 'antd';

export function collectMenuKeyPaths(menus: MenuItem[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.path) {
        map.set(item.key, item.path);
      }
      if (item.children?.length) {
        walk(item.children);
      }
    }
  };
  walk(menus);
  return map;
}

export function buildMenuItems(menus: MenuItem[]): MenuProps['items'] {
  return menus.map((item) => {
    const icon = item.icon ? <AppIcon name={item.icon} size={16} /> : undefined;
    if (item.children?.length) {
      return {
        key: item.key,
        icon,
        label: item.label,
        children: buildMenuItems(item.children),
      };
    }
    return {
      key: item.key,
      icon,
      label: item.label,
    };
  });
}

type Selection = { key: string; pathLen: number; ancestors: string[] };

function pickBetter(a: Selection | null, b: Selection | null): Selection | null {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return b.pathLen > a.pathLen ? b : a;
}

function walkMenus(items: MenuItem[], pathname: string, ancestors: string[]): Selection | null {
  let best: Selection | null = null;

  for (const item of items) {
    if (item.children?.length) {
      best = pickBetter(best, walkMenus(item.children, pathname, [...ancestors, item.key]));
    }
    if (!item.path) {
      continue;
    }
    const base = item.path === '/' ? '/' : item.path.replace(/\/$/, '') || '/';
    const matches =
      (base === '/' && (pathname === '/' || pathname === '')) ||
      (base !== '/' &&
        (pathname === base || pathname === item.path || pathname.startsWith(`${base}/`)));
    if (matches) {
      const candidate: Selection = {
        key: item.key,
        pathLen: base.length,
        ancestors,
      };
      best = pickBetter(best, candidate);
    }
  }

  return best;
}

export function getMenuSelection(
  menus: MenuItem[],
  pathname: string,
): { selectedKeys: string[]; openKeys: string[] } {
  const best = walkMenus(menus, pathname, []);

  if (!best) {
    return { selectedKeys: [], openKeys: [] };
  }

  return {
    selectedKeys: [best.key],
    openKeys: best.ancestors,
  };
}
