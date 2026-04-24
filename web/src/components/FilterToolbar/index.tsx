import { useRef, useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { Flex, Button, Popover, Badge, theme } from 'antd';
import { Filter } from '@/core/icons';

interface FilterItem {
  key: string;
  element: ReactNode;
  minWidth?: number;
}

interface FilterToolbarProps {
  filters: FilterItem[];
  actions?: ReactNode;
  style?: CSSProperties;
}

export function FilterToolbar({ filters, actions, style }: FilterToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(filters.length);
  const { token } = theme.useToken();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const actionsWidth = 200;
    const gap = 12;

    const updateFromWidth = (width: number) => {
      const availableWidth = width - actionsWidth;
      let count = 0;
      let used = 0;
      for (const filter of filters) {
        const minW = filter.minWidth ?? 180;
        if (used + minW > availableWidth && count > 0) break;
        used += minW + gap;
        count++;
      }
      setVisibleCount(Math.max(1, count));
    };

    updateFromWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.getBoundingClientRect().width;
      updateFromWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [filters]);

  const visible = filters.slice(0, visibleCount);
  const overflow = filters.slice(visibleCount);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: token.padding,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        ...style,
      }}
    >
      <Flex gap={12} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        {visible.map((f) => (
          <div key={f.key} style={{ minWidth: f.minWidth ?? 180 }}>
            {f.element}
          </div>
        ))}
        {overflow.length > 0 ? (
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <Flex vertical gap={12} style={{ minWidth: 220 }}>
                {overflow.map((f) => (
                  <div key={f.key}>{f.element}</div>
                ))}
              </Flex>
            }
          >
            <Badge count={overflow.length} size="small">
              <Button icon={<Filter size={14} />}>更多筛选</Button>
            </Badge>
          </Popover>
        ) : null}
      </Flex>
      {actions ? <Flex gap={8} style={{ flexShrink: 0 }}>{actions}</Flex> : null}
    </div>
  );
}
