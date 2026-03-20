import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import BasicLayout from './components/Layout/BasicLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Users from './pages/Settings/Users';
import Roles from './pages/Settings/Roles';
import Menus from './pages/Settings/Menus';
import AuditLogs from './pages/Settings/AuditLogs';
import Permissions from './pages/Settings/Permissions';
import AssetGroups from './pages/Assets/Groups';
import MonitorDashboard from './pages/Monitor';
import AlertRules from './pages/Monitor/AlertRules';
import AlertEvents from './pages/Monitor/AlertEvents';
import Channels from './pages/Monitor/Channels';
import JobTemplates from './pages/Jobs/Templates';
import JobExecutions from './pages/Jobs/Executions';
import Changes from './pages/Changes';
import Credentials from './pages/Credentials';
import Inspections from './pages/Inspections';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<BasicLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="assets">
                <Route index element={<Assets />} />
                <Route path="groups" element={<AssetGroups />} />
              </Route>
              <Route path="monitor">
                <Route index element={<MonitorDashboard />} />
                <Route path="rules" element={<AlertRules />} />
                <Route path="events" element={<AlertEvents />} />
                <Route path="channels" element={<Channels />} />
              </Route>
              <Route path="jobs">
                <Route index element={<JobTemplates />} />
                <Route path="executions" element={<JobExecutions />} />
              </Route>
              <Route path="changes" element={<Changes />} />
              <Route path="credentials" element={<Credentials />} />
              <Route path="inspections" element={<Inspections />} />
              <Route path="settings">
                <Route path="users" element={<Users />} />
                <Route path="roles" element={<Roles />} />
                <Route path="menus" element={<Menus />} />
                <Route path="permissions" element={<Permissions />} />
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
