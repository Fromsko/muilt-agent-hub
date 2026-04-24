import { Result, Button } from 'antd';
import { motion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import { scaleVariants } from '@/core/motion';
import { Home } from '@/core/icons';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: '60vh',
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在"
        extra={
          <Button
            type="primary"
            icon={<Home size={14} />}
            onClick={() => navigate({ to: '/' })}
          >
            返回首页
          </Button>
        }
      />
    </motion.div>
  );
}
