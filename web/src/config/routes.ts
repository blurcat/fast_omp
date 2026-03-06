import {
  DashboardOutlined,
  DesktopOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
} from '@ant-design/icons';

export default [
  {
    path: '/dashboard',
    name: '仪表板',
    icon: DashboardOutlined,
  },
  {
    path: '/assets',
    name: '资产管理',
    icon: DesktopOutlined,
  },
  {
    path: '/settings',
    name: '系统设置',
    icon: SettingOutlined,
    routes: [
      {
        path: '/settings/users',
        name: '用户管理',
        icon: UserOutlined,
      },
      {
        path: '/settings/roles',
        name: '角色管理',
        icon: TeamOutlined,
      },
      {
        path: '/settings/menus',
        name: '菜单管理',
        icon: MenuOutlined,
      },
    ],
  },
];
