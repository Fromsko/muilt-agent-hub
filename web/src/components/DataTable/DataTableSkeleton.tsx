import { Skeleton } from 'antd';
import { motion } from 'motion/react';
import { fadeVariants } from '@/core/motion';

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function DataTableSkeleton({ rows = 5, columns = 4 }: DataTableSkeletonProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 16 }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton.Input key={i} active style={{ width: `${100 / columns}%`, height: 20 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton.Input key={j} active style={{ width: `${100 / columns}%`, height: 16 }} />
          ))}
        </div>
      ))}
    </motion.div>
  );
}
