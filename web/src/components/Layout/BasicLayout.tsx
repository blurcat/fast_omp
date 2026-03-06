import React, { useEffect, useState } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import * as Icons from '@ant-design/icons';
import { Dropdown, message } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUserProfile, logout } from '../../store/slices/authSlice';
import { getMenus, type Menu } from '../../services/menus';

const { LogoutOutlined, UserOutlined } = Icons;

// 动态图标渲染组件
const DynamicIcon = ({ icon }: { icon: string }) => {
  const IconComponent = (Icons as any)[icon];
  return IconComponent ? <IconComponent /> : null;
};

const BasicLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [menuData, setMenuData] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchUserProfile());
    }
  }, [isAuthenticated, user, dispatch]);

  // 获取动态菜单
  useEffect(() => {
    if (isAuthenticated) {
      const fetchMenus = async () => {
        try {
          const menus = await getMenus();
          const formatMenus = (items: Menu[]): any[] => {
            return items.map((item) => ({
              path: item.path || undefined,
              name: item.title,
              icon: item.icon ? <DynamicIcon icon={item.icon} /> : undefined,
              children: item.children ? formatMenus(item.children) : undefined,
            }));
          };
          setMenuData(formatMenus(menus));
        } catch (error) {
          console.error('Failed to fetch menus:', error);
          // 失败时可以保留空或显示默认
        }
      };
      fetchMenus();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    message.success('退出登录成功');
  };

  const userMenu = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      id="test-pro-layout"
      style={{
        height: '100vh',
      }}
    >
      <ProLayout
        title="Ops Middle Platform"
        logo={null}
        location={{
          pathname: location.pathname,
        }}
        route={{
          routes: menuData,
        }}
        menuItemRender={(item, dom) => (
          <Link to={item.path || '/'}>{dom}</Link>
        )}
        avatarProps={{
          icon: <UserOutlined />,
          title: user?.username || 'Admin',
          render: (_, dom) => (
            <Dropdown menu={{ items: userMenu }}>
              {dom}
            </Dropdown>
          ),
        }}
        layout="mix"
        splitMenus={false}
      >
        <Outlet />
      </ProLayout>
    </div>
  );
};

export default BasicLayout;
