import {
  DashboardOutlined,
  DesktopOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  MenuOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined,
  LockOutlined,
  SearchOutlined,
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
    routes: [
      { path: '/assets', name: '资产列表', icon: DesktopOutlined },
      { path: '/assets/groups', name: '资产分组', icon: TeamOutlined },
    ],
  },
  {
    path: '/monitor',
    name: '监控告警',
    icon: AlertOutlined,
    routes: [
      { path: '/monitor', name: '告警概览', icon: AlertOutlined },
      { path: '/monitor/rules', name: '告警规则', icon: AlertOutlined },
      { path: '/monitor/events', name: '告警事件', icon: AlertOutlined },
      { path: '/monitor/channels', name: '通知渠道', icon: AlertOutlined },
    ],
  },
  {
    path: '/jobs',
    name: '作业平台',
    icon: ThunderboltOutlined,
    routes: [
      { path: '/jobs', name: '作业模板', icon: ThunderboltOutlined },
      { path: '/jobs/executions', name: '执行记录', icon: ThunderboltOutlined },
    ],
  },
  {
    path: '/changes',
    name: '变更管理',
    icon: DeploymentUnitOutlined,
  },
  {
    path: '/credentials',
    name: '凭证管理',
    icon: LockOutlined,
  },
  {
    path: '/inspections',
    name: '巡检管理',
    icon: SearchOutlined,
  },
  {
    path: '/settings',
    name: '系统设置',
    icon: SettingOutlined,
    routes: [
      { path: '/settings/users', name: '用户管理', icon: UserOutlined },
      { path: '/settings/roles', name: '角色管理', icon: TeamOutlined },
      { path: '/settings/menus', name: '菜单管理', icon: MenuOutlined },
      { path: '/settings/permissions', name: '权限管理', icon: LockOutlined },
      { path: '/settings/audit-logs', name: '审计日志', icon: SearchOutlined },
    ],
  },
];
