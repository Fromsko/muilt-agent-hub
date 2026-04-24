import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import * as icons from './index';

const iconMap = new Map<string, LucideIcon>();

function isIconComponent(value: unknown): value is LucideIcon {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && '$$typeof' in value)
  );
}

for (const [name, component] of Object.entries(icons)) {
  if (isIconComponent(component) && name !== 'default') {
    iconMap.set(name, component);
  }
}

export function registerIcon(name: string, component: LucideIcon): void {
  iconMap.set(name, component);
}

export function getIcon(name: string): LucideIcon | undefined {
  return iconMap.get(name);
}

export function getIconNames(): string[] {
  return Array.from(iconMap.keys());
}

interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  rotate?: number;
  onClick?: () => void;
}

export function AppIcon({
  name,
  size = 18,
  color,
  strokeWidth = 2,
  className,
  rotate,
  onClick,
}: AppIconProps) {
  const IconComponent = iconMap.get(name);

  if (!IconComponent) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`Icon not found: ${name}`}
      >
        □
      </span>
    );
  }

  const style: CSSProperties = {};
  if (rotate) {
    style.transform = `rotate(${rotate}deg)`;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}
