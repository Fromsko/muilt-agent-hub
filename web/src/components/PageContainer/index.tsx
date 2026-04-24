import { Flex, Typography } from 'antd';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { fadeVariants } from '@/core/motion';

const { Title, Paragraph } = Typography;

interface PageContainerProps {
  title?: string;
  subtitle?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}

export function PageContainer({ title, subtitle, extra, children }: PageContainerProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}
    >
      {(title || subtitle || extra) && (
        <Flex
          justify="space-between"
          align="flex-start"
          gap={16}
          wrap="wrap"
          style={{ minWidth: 0 }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {title ? <Title level={4} style={{ margin: 0 }}>{title}</Title> : null}
            {subtitle ? (
              <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
                {subtitle}
              </Paragraph>
            ) : null}
          </div>
          {extra ? <div style={{ flexShrink: 0 }}>{extra}</div> : null}
        </Flex>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </motion.div>
  );
}
