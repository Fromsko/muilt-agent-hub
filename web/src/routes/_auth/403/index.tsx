import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Result, Button } from 'antd';
import { motion } from 'motion/react';
import { scaleVariants } from '@/core/motion';
import { Home } from '@/core/icons';

export const Route = createFileRoute('/_auth/403/')({
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}
    >
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面"
        extra={
          <Button type="primary" icon={<Home size={14} />} onClick={() => navigate({ to: '/dashboard' })}>
            返回首页
          </Button>
        }
      />
    </motion.div>
  );
}
