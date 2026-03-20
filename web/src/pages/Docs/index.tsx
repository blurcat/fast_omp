import React from 'react';
import { Layout, Typography, Card, Tag, Table, Divider, Space, Alert } from 'antd';
import {
  DashboardOutlined, DesktopOutlined, AlertOutlined, ThunderboltOutlined,
  DeploymentUnitOutlined, LockOutlined, SearchOutlined, SettingOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Sider, Content } = Layout;

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <div id={id} style={{ marginBottom: 48 }}>
    <Title level={2} style={{ borderBottom: '2px solid #1890ff', paddingBottom: 8, marginBottom: 24 }}>
      {title}
    </Title>
    {children}
  </div>
);

const SubSection: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <div id={id} style={{ marginBottom: 32 }}>
    <Title level={4} style={{ color: '#262626', marginBottom: 12 }}>{title}</Title>
    {children}
  </div>
);

const Docs: React.FC = () => {
  const menuItems = [
    { key: 'overview', label: '📖 平台概览', icon: <DashboardOutlined /> },
    { key: 'assets', label: '🖥️ 资产管理', icon: <DesktopOutlined /> },
    { key: 'monitor', label: '🔔 监控告警', icon: <AlertOutlined /> },
    { key: 'jobs', label: '⚡ 作业平台', icon: <ThunderboltOutlined /> },
    { key: 'changes', label: '🚀 变更管理', icon: <DeploymentUnitOutlined /> },
    { key: 'credentials', label: '🔐 凭证管理', icon: <LockOutlined /> },
    { key: 'inspections', label: '🔍 巡检管理', icon: <SearchOutlined /> },
    { key: 'settings', label: '⚙️ 系统管理', icon: <SettingOutlined /> },
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* 顶部标题栏 */}
      <div style={{
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        padding: '32px 48px',
        color: '#fff',
      }}>
        <Title level={1} style={{ color: '#fff', margin: 0 }}>
          OMP 运维管理平台 · 使用说明
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginTop: 8, marginBottom: 0, fontSize: 16 }}>
          Ops Middle Platform — 现代化一站式运维管理平台
        </Paragraph>
      </div>

      <Layout style={{ background: '#f5f7fa' }}>
        {/* 左侧导航 */}
        <Sider
          width={220}
          style={{
            background: '#fff',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ padding: '8px 16px', color: '#8c8c8c', fontSize: 12, fontWeight: 600 }}>文档目录</div>
            {menuItems.map(item => (
              <div
                key={item.key}
                onClick={() => scrollTo(item.key)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#595959',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e6f7ff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon} {item.label.replace(/^.*? /, '')}
              </div>
            ))}
          </div>
        </Sider>

        {/* 主内容 */}
        <Content style={{ padding: '40px 48px', maxWidth: 900 }}>

          {/* 平台概览 */}
          <Section id="overview" title="📖 平台概览">
            <Alert
              type="info"
              showIcon
              message="OMP（Ops Middle Platform）是一个现代化运维管理平台，整合资产管理、监控告警、作业执行、变更管理等核心运维能力。"
              style={{ marginBottom: 24 }}
            />
            <Card title="功能模块总览">
              <Table
                pagination={false}
                size="small"
                dataSource={[
                  { module: '资产管理', desc: '统一管理多云及本地资产，支持分组与权限控制', path: '/assets' },
                  { module: '监控告警', desc: '指标采集、告警规则、多渠道通知（钉钉/Webhook/邮件）', path: '/monitor' },
                  { module: '作业平台', desc: '批量 SSH 远程执行命令，支持模板复用与执行记录', path: '/jobs' },
                  { module: '变更管理', desc: '变更工单申请、审批流程、操作记录追溯', path: '/changes' },
                  { module: '凭证管理', desc: '集中管理 SSH/Token/DB 凭证，加密存储', path: '/credentials' },
                  { module: '巡检管理', desc: '定时或手动触发资产健康巡检，生成巡检报告', path: '/inspections' },
                  { module: '系统管理', desc: '用户、角色、菜单、权限及审计日志', path: '/settings' },
                ]}
                columns={[
                  { title: '模块', dataIndex: 'module', width: 120, render: v => <Text strong>{v}</Text> },
                  { title: '功能说明', dataIndex: 'desc' },
                  { title: '路径', dataIndex: 'path', render: v => <Tag color="blue">{v}</Tag> },
                ]}
              />
            </Card>

            <Card title="默认账号" style={{ marginTop: 16 }}>
              <Space direction="vertical">
                <div><Text strong>用户名：</Text><Tag color="green">admin</Tag></div>
                <div><Text strong>密码：</Text><Tag color="green">admin123</Tag></div>
                <Text type="secondary">首次登录后请及时修改密码。</Text>
              </Space>
            </Card>
          </Section>

          {/* 资产管理 */}
          <Section id="assets" title="🖥️ 资产管理">
            <SubSection id="assets-list" title="资产列表">
              <Paragraph>统一管理所有 IT 资产，支持多云厂商（阿里云、AWS、腾讯云、本地IDC）。</Paragraph>
              <Card size="small">
                <Table
                  pagination={false}
                  size="small"
                  dataSource={[
                    { op: '新建资产', desc: '点击右上角「新建」按钮，填写名称、IP、类型、云厂商等信息' },
                    { op: '搜索筛选', desc: '支持按名称、IP、类型、云厂商、状态、业务线、负责人多维度筛选' },
                    { op: '编辑资产', desc: '点击操作列「编辑」，可修改资产所有信息包括所属分组' },
                    { op: '查看详情', desc: '点击「详情」查看资产完整信息，包括创建时间、更新时间' },
                    { op: '删除资产', desc: '点击「删除」并在弹窗确认，操作不可逆' },
                  ]}
                  columns={[
                    { title: '操作', dataIndex: 'op', width: 120, render: v => <Tag>{v}</Tag> },
                    { title: '说明', dataIndex: 'desc' },
                  ]}
                />
              </Card>
              <Alert style={{ marginTop: 12 }} type="warning" showIcon
                message="同一云厂商下 IP 地址不可重复；IP 地址为必填项。" />
            </SubSection>

            <SubSection id="assets-groups" title="资产分组">
              <Paragraph>将资产按业务线、环境、团队等维度归组，方便批量权限管理。</Paragraph>
              <Card size="small">
                <Paragraph>
                  <ul>
                    <li>创建分组后，在资产编辑页面的「所属分组」字段选择对应分组（支持多选）</li>
                    <li>也可在「资产分组」页面直接将资产加入/移出分组</li>
                    <li>分组权限在「系统管理 → 权限管理」中配置，支持按分组批量授权</li>
                  </ul>
                </Paragraph>
              </Card>
            </SubSection>
          </Section>

          {/* 监控告警 */}
          <Section id="monitor" title="🔔 监控告警">
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message="监控告警需要在目标主机上部署 Agent 向平台推送指标数据（CPU/内存/磁盘），或通过外部系统调用指标写入 API。" />

            <SubSection id="monitor-channels" title="第一步：配置通知渠道">
              <Card size="small">
                <Paragraph>前往「监控告警 → 通知渠道」新建渠道：</Paragraph>
                <Table
                  pagination={false}
                  size="small"
                  dataSource={[
                    { type: '钉钉机器人', config: '填写 Webhook URL 和加签密钥（可选）', desc: '群机器人消息推送' },
                    { type: 'Webhook', config: '填写任意 HTTP POST 地址', desc: '通用 Webhook 回调' },
                    { type: '邮件', config: '填写收件人邮箱（逗号分隔）', desc: '邮件通知（需配置SMTP）' },
                  ]}
                  columns={[
                    { title: '类型', dataIndex: 'type', width: 120, render: v => <Tag color="blue">{v}</Tag> },
                    { title: '配置项', dataIndex: 'config' },
                    { title: '说明', dataIndex: 'desc' },
                  ]}
                />
              </Card>
            </SubSection>

            <SubSection id="monitor-rules" title="第二步：创建告警规则">
              <Card size="small">
                <Paragraph>前往「监控告警 → 告警规则」创建规则，配置项说明：</Paragraph>
                <Table
                  pagination={false}
                  size="small"
                  dataSource={[
                    { field: '监控指标', desc: 'cpu_usage（CPU%）、mem_usage（内存%）、disk_usage（磁盘%）等' },
                    { field: '比较符', desc: '> / < / >= / <= 与阈值组合，例如 cpu_usage > 80' },
                    { field: '持续时间', desc: '指标持续超阈值多少分钟才触发告警，避免毛刺误报' },
                    { field: '严重级别', desc: '信息 / 警告 / 严重，影响通知的标题样式' },
                    { field: '通知渠道', desc: '关联第一步创建的渠道，支持多选' },
                  ]}
                  columns={[
                    { title: '配置项', dataIndex: 'field', width: 120, render: v => <Text strong>{v}</Text> },
                    { title: '说明', dataIndex: 'desc' },
                  ]}
                />
              </Card>
            </SubSection>

            <SubSection id="monitor-events" title="第三步：处理告警事件">
              <Card size="small">
                <Paragraph>前往「监控告警 → 告警事件」查看所有告警：</Paragraph>
                <ul>
                  <li><Tag color="red">告警中</Tag> 规则条件持续满足，可点击「确认」表示已知晓</li>
                  <li><Tag color="orange">已确认</Tag> 运维人员已确认，待处理</li>
                  <li><Tag color="green">已恢复</Tag> 指标恢复正常（自动）或手动标记恢复</li>
                </ul>
                <Paragraph>
                  点击「告警概览」页面的「<Text strong>立即评估规则</Text>」按钮可手动触发一次规则评估。
                </Paragraph>
              </Card>
            </SubSection>

            <SubSection id="monitor-metrics" title="指标数据写入 API">
              <Card size="small">
                <Paragraph>外部 Agent 通过以下接口推送指标：</Paragraph>
                <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, fontSize: 13 }}>{`POST /api/v1/monitor/metrics/
Authorization: Bearer <token>
Content-Type: application/json

{
  "resource_id": 1,
  "resource_name": "web-server-01",
  "metric": "cpu_usage",
  "value": 85.3,
  "unit": "%"
}

# 批量推送
POST /api/v1/monitor/metrics/batch/`}
                </pre>
              </Card>
            </SubSection>
          </Section>

          {/* 作业平台 */}
          <Section id="jobs" title="⚡ 作业平台">
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message="作业执行通过 SSH 连接目标主机运行脚本，需确保平台服务器与目标主机网络互通，且凭证配置正确。" />

            <SubSection id="jobs-templates" title="作业模板">
              <Card size="small">
                <Paragraph>前往「作业平台 → 作业模板」管理可复用脚本：</Paragraph>
                <ul>
                  <li><Text strong>模板名称：</Text>便于识别的名称，如「重启 Nginx」</li>
                  <li><Text strong>脚本内容：</Text>Shell 脚本，例如 <code>systemctl restart nginx</code></li>
                  <li><Text strong>超时时间：</Text>单次执行超时秒数，默认 300 秒</li>
                </ul>
              </Card>
            </SubSection>

            <SubSection id="jobs-execute" title="执行作业">
              <Card size="small">
                <Paragraph>点击模板列表的「<Text strong>执行</Text>」按钮，弹出执行窗口：</Paragraph>
                <ol>
                  <li>在「目标主机」下拉框选择一台或多台资产（仅显示有 IP 的资产）</li>
                  <li>可临时修改脚本内容（不影响模板原内容）</li>
                  <li>点击「立即执行」，平台并发 SSH 到所有目标主机</li>
                  <li>执行完成后展示每台主机的输出、错误信息和退出码</li>
                </ol>
                <Alert type="warning" showIcon
                  message="当前版本凭证认证尚未与凭证管理联动，默认使用 root 账户连接。生产环境请在代码中配置 SSH Key 或等待后续版本。" />
              </Card>
            </SubSection>

            <SubSection id="jobs-history" title="执行记录">
              <Card size="small">
                <Paragraph>前往「作业平台 → 执行记录」查看历史执行：</Paragraph>
                <ul>
                  <li>点击「详情」查看每台主机的完整输出日志</li>
                  <li>结果统计显示成功/失败台数</li>
                </ul>
              </Card>
            </SubSection>
          </Section>

          {/* 变更管理 */}
          <Section id="changes" title="🚀 变更管理">
            <SubSection id="changes-flow" title="变更工单流程">
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {['草稿', '→', '待审批', '→', '已批准/已拒绝', '→', '执行中', '→', '已完成'].map((s, i) =>
                    s === '→' ? <span key={i} style={{ color: '#8c8c8c' }}>→</span> :
                      <Tag key={i} color={s === '已完成' ? 'green' : s === '已拒绝' ? 'red' : 'blue'}>{s}</Tag>
                  )}
                </div>
                <Table
                  pagination={false}
                  size="small"
                  dataSource={[
                    { status: '草稿', op: '创建变更', who: '申请人', desc: '可编辑所有信息，点击「提交」进入审批' },
                    { status: '待审批', op: '审批', who: '超级管理员', desc: '管理员点击「批准」或「拒绝」并填写意见' },
                    { status: '已批准', op: '执行变更', who: '申请人', desc: '按变更方案执行操作' },
                    { status: '已完成', op: '关闭', who: '申请人', desc: '变更执行完毕，更新状态为完成' },
                  ]}
                  columns={[
                    { title: '状态', dataIndex: 'status', width: 90, render: v => <Tag>{v}</Tag> },
                    { title: '操作', dataIndex: 'op', width: 100 },
                    { title: '操作人', dataIndex: 'who', width: 110 },
                    { title: '说明', dataIndex: 'desc' },
                  ]}
                />
              </Card>
            </SubSection>

            <SubSection id="changes-create" title="创建变更">
              <Card size="small">
                <ul>
                  <li><Text strong>变更类型：</Text>普通变更（常规）/ 紧急变更（紧急上线）/ 标准变更（低风险）</li>
                  <li><Text strong>风险级别：</Text>低 / 中 / 高，影响审批优先级</li>
                  <li><Text strong>变更方案：</Text>详细描述变更步骤</li>
                  <li><Text strong>回滚方案：</Text>变更失败时的恢复步骤（必须填写）</li>
                  <li><Text strong>计划时间：</Text>预计执行时间窗口</li>
                </ul>
              </Card>
            </SubSection>
          </Section>

          {/* 凭证管理 */}
          <Section id="credentials" title="🔐 凭证管理">
            <Paragraph>集中存储运维凭证，所有敏感数据加密保存，页面不显示明文。</Paragraph>
            <Card size="small">
              <Table
                pagination={false}
                size="small"
                dataSource={[
                  { type: 'SSH 密码', field: '用户名 + 密码', usage: '连接 Linux/Windows 主机' },
                  { type: 'SSH 密钥', field: '用户名 + 私钥内容', usage: '免密登录（更安全）' },
                  { type: 'API Token', field: 'Token 字符串', usage: '第三方系统 API 鉴权' },
                  { type: '数据库', field: '用户名 + 密码', usage: 'MySQL/PostgreSQL/Redis 等' },
                ]}
                columns={[
                  { title: '凭证类型', dataIndex: 'type', width: 120, render: v => <Tag color="purple">{v}</Tag> },
                  { title: '需填写', dataIndex: 'field' },
                  { title: '适用场景', dataIndex: 'usage' },
                ]}
              />
            </Card>
            <Alert style={{ marginTop: 12 }} type="info" showIcon
              message="凭证名称全局唯一；密码字段只在创建时填写，后续查看不显示明文；修改凭证时密码留空则不更新。" />
          </Section>

          {/* 巡检管理 */}
          <Section id="inspections" title="🔍 巡检管理">
            <Paragraph>通过巡检模板定义检查项，手动或定时对资产执行健康检查并生成报告。</Paragraph>

            <SubSection id="inspections-template" title="巡检模板">
              <Card size="small">
                <ul>
                  <li><Text strong>巡检脚本：</Text>执行在目标主机上的 Shell 命令，输出结果计入报告</li>
                  <li><Text strong>Cron 表达式：</Text>定时巡检时间，如 <code>0 9 * * *</code> 表示每天 9:00（功能开发中）</li>
                  <li><Text strong>巡检项目：</Text>结构化检查清单（JSON 格式），用于前端展示</li>
                </ul>
              </Card>
            </SubSection>

            <SubSection id="inspections-task" title="巡检任务">
              <Card size="small">
                <ol>
                  <li>点击「新建任务」，填写任务名称</li>
                  <li>在任务列表点击「执行」立即运行巡检</li>
                  <li>执行完成后查看状态（完成/失败）及巡检报告详情</li>
                </ol>
              </Card>
            </SubSection>
          </Section>

          {/* 系统管理 */}
          <Section id="settings" title="⚙️ 系统管理">
            <SubSection id="settings-users" title="用户管理">
              <Card size="small">
                <ul>
                  <li>创建、编辑、禁用用户账号</li>
                  <li>为用户分配角色（角色决定菜单可见范围）</li>
                  <li><Tag color="red">超级管理员</Tag> 拥有所有权限，不受角色限制</li>
                </ul>
              </Card>
            </SubSection>

            <SubSection id="settings-roles" title="角色管理">
              <Card size="small">
                <Paragraph>角色用于控制用户的操作权限范围，创建角色时在 permissions 字段（JSON）定义权限集合。</Paragraph>
              </Card>
            </SubSection>

            <SubSection id="settings-menus" title="菜单管理">
              <Card size="small">
                <Paragraph>动态配置前端侧边栏菜单，支持多级菜单。图标名称使用 Ant Design Icons 组件名，例如：</Paragraph>
                <Space wrap>
                  {['AlertOutlined', 'DesktopOutlined', 'LockOutlined', 'SettingOutlined', 'ThunderboltOutlined'].map(i =>
                    <Tag key={i}>{i}</Tag>
                  )}
                </Space>
              </Card>
            </SubSection>

            <SubSection id="settings-permissions" title="权限管理">
              <Card size="small">
                <ul>
                  <li>为指定用户授予某资产或资产分组的 <Tag color="blue">read</Tag> 或 <Tag color="orange">write</Tag> 权限</li>
                  <li><Text strong>资源级权限：</Text>精确控制到单台资产</li>
                  <li><Text strong>分组级权限：</Text>分组内所有资产继承该权限</li>
                  <li>write 权限包含 read 权限</li>
                </ul>
              </Card>
            </SubSection>

            <SubSection id="settings-audit" title="审计日志">
              <Card size="small">
                <Paragraph>记录所有用户操作行为，包括：</Paragraph>
                <Space wrap>
                  {['登录/登录失败', '资产创建/编辑/删除', '分组成员变更', '权限授予/撤销', '变更工单操作'].map(a =>
                    <Tag key={a} icon={<CheckCircleOutlined />} color="green">{a}</Tag>
                  )}
                </Space>
                <Paragraph style={{ marginTop: 12 }}>每条日志记录操作人、操作类型、目标对象和来源 IP。</Paragraph>
              </Card>
            </SubSection>
          </Section>

          <Divider />
          <div style={{ textAlign: 'center', color: '#8c8c8c', paddingBottom: 40 }}>
            OMP 运维管理平台 · 如有问题请联系系统管理员
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Docs;
