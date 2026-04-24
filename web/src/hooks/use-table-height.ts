import { useEffect, useRef, useState, type RefObject } from 'react';

export function useTableHeight(offset: number = 0): {
  containerRef: RefObject<HTMLDivElement | null>;
  tableHeight: number;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 400;
      setTableHeight(Math.max(200, height - offset));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [offset]);

  return { containerRef, tableHeight };
}
