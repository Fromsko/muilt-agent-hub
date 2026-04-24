import { Avatar, Dropdown, Flex, Typography, theme } from 'antd';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth';
import { LogOut, Settings, User, ChevronDown } from '@/core/icons';
import type { MenuProps } from 'antd';

const { Text } = Typography;

export function UserMenu({
  collapsed = false,
  inverted = false,
}: {
  collapsed?: boolean;
  inverted?: boolean;
}) {
  const { token } = theme.useToken();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const fg = inverted ? token.colorTextLightSolid : undefined;

  const items: MenuProps['items'] = [
    { key: 'settings', icon: <Settings size={14} />, label: '设置' },
    { type: 'divider' },
    { key: 'logout', icon: <LogOut size={14} />, label: '退出登录', danger: true },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      void navigate({ href: '/login' });
    } else if (key === 'settings') {
      void navigate({ href: '/settings' });
    }
  };

  if (!user) {
    return null;
  }

  const trigger = collapsed ? (
    <Flex
      align="center"
      justify="center"
      style={{ width: '100%', padding: '8px 0', cursor: 'pointer', color: fg }}
    >
      <Avatar src={user.avatar} icon={<User size={16} />} size="small" />
    </Flex>
  ) : (
    <Flex
      align="center"
      gap={10}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        color: fg,
      }}
    >
      <Avatar src={user.avatar} icon={<User size={16} />} size="small" />
      <Flex vertical style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <Text ellipsis strong style={{ fontSize: 13, color: fg }}>
          {user.name}
        </Text>
        <Text
          ellipsis
          style={{
            fontSize: 11,
            ...(inverted ? { color: 'rgba(255,255,255,0.65)' } : {}),
          }}
          type={inverted ? undefined : 'secondary'}
        >
          {user.email}
        </Text>
      </Flex>
      <ChevronDown size={14} color={fg} />
    </Flex>
  );

  return (
    <Dropdown menu={{ items, onClick }} placement="topRight" trigger={['click']}>
      {trigger}
    </Dropdown>
  );
}
