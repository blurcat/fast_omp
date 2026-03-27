import React, { useRef, useState, useEffect } from 'react';
import {
  PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect,
  type ActionType, type ProColumns,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Tabs, Drawer, Space, Typography, Collapse } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import {
  getInspectionTemplates, createInspectionTemplate, updateInspectionTemplate, deleteInspectionTemplate,
  getInspectionTasks, createInspectionTask, runInspectionTask, deleteInspectionTask,
} from '../../services/inspections';
import { getAssets } from '../../services/assets';

const { Text } = Typography;

// 预设巡检脚本
const PRESET_SCRIPTS: { label: string; script: string }[] = [
  {
    label: '基础健康检查',
    script: `echo "=== 主机名 ===" && hostname
echo "=== 系统时间 ===" && date
echo "=== 系统运行时间 ===" && uptime
echo "=== CPU 使用率 ===" && top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
echo "=== 内存使用 ===" && free -h
echo "=== 磁盘使用 ===" && df -h
echo "=== 系统负载 ===" && cat /proc/loadavg`,
  },
  {
    label: '磁盘检查',
    script: `echo "=== 磁盘使用情况 ===" && df -h
echo "=== 磁盘 inode ===" && df -i
echo "=== 大文件（>100MB）===" && find / -xdev -size +100M -exec ls -lh {} \\; 2>/dev/null | head -20`,
  },
  {
    label: '内存检查',
    script: `echo "=== 内存总览 ===" && free -h
echo "=== 内存详情 ===" && cat /proc/meminfo | head -20
echo "=== 内存占用 TOP10 ===" && ps aux --sort=-%mem | head -11`,
  },
  {
    label: 'CPU 检查',
    script: `echo "=== CPU 信息 ===" && lscpu | grep -E "Model name|CPU\\(s\\)|MHz"
echo "=== 系统负载 ===" && uptime
echo "=== CPU 占用 TOP10 ===" && ps aux --sort=-%cpu | head -11`,
  },
  {
    label: '网络检查',
    script: `echo "=== 网络接口 ===" && ip addr show
echo "=== 网络连接数 ===" && ss -s
echo "=== 监听端口 ===" && ss -tlnp`,
  },
];

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待执行', color: 'default' },
  running: { text: '执行中', color: 'processing' },
  completed: { text: '完成', color: 'success' },
  failed: { text: '部分失败', color: 'warning' },
};

const Inspections: React.FC = () => {
  const tmplRef = useRef<ActionType | undefined>(undefined);
  const taskRef = useRef<ActionType | undefined>(undefined);

  const [tmplCreateOpen, setTmplCreateOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<any>(null);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);

  const [templates, setTemplates] = useState<any[]>([]);
  const [assets, setAssets] = useState<{ label: string; value: number }[]>([]);

  const [resultDrawer, setResultDrawer] = useState(false);
  const [resultTask, setResultTask] = useState<any>(null);

  useEffect(() => {
    // 加载模板列表供任务创建时选择
    getInspectionTemplates({ limit: 200 }).then((res: any) => {
      if (Array.isArray(res)) setTemplates(res);
    });
    // 加载资产列表（有 IP 的资产，用于巡检目标选择）
    getAssets({ limit: 500 }).then((res: any) => {
      const items = res?.items || [];
      setAssets(items.filter((a: any) => a.ip_address).map((a: any) => ({
        label: `${a.name}（${a.ip_address}）${!a.credential_id ? ' ⚠️无凭证' : ''}`,
        value: a.id,
      })));
    });
  }, []);

  const handleRunTask = async (record: any) => {
    setRunningId(record.id);
    try {
      await runInspectionTask(record.id);
      message.success('巡检完成');
      taskRef.current?.reload();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '执行失败');
    } finally {
      setRunningId(null);
    }
  };

  const templateColumns: ProColumns[] = [
    { title: '模板名称', dataIndex: 'name', ellipsis: true },
    {
      title: '脚本预览', dataIndex: 'script', search: false, ellipsis: true,
      render: (val: any) => <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(val || '').split('\n')[0]}</Text>,
    },
    { title: '创建人', dataIndex: 'created_by', search: false, width: 100 },
    {
      title: '状态', dataIndex: 'enabled', search: false, width: 80,
      render: (_: any, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option', width: 120,
      render: (_: any, record: any) => [
        <a key="edit" onClick={() => { setEditingTmpl(record); setTmplCreateOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteInspectionTemplate(record.id);
          message.success('已删除');
          tmplRef.current?.reload();
          getInspectionTemplates({ limit: 200 }).then((res: any) => { if (Array.isArray(res)) setTemplates(res); });
        }}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  const taskColumns: ProColumns[] = [
    { title: '任务名称', dataIndex: 'name', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (_: any, r: any) => <Tag color={statusMap[r.status]?.color}>{statusMap[r.status]?.text || r.status}</Tag>,
    },
    {
      title: '目标主机', dataIndex: 'targets', search: false, width: 100,
      render: (val: any) => <Tag>{Array.isArray(val) ? val.length : 0} 台</Tag>,
    },
    {
      title: '结果', dataIndex: 'report', search: false, width: 110,
      render: (_: any, r: any) => {
        const rpt = r.report || {};
        if (!rpt.total) return '—';
        return (
          <Space size={4}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>{rpt.success_count}/{rpt.total}</span>
          </Space>
        );
      },
    },
    { title: '开始时间', dataIndex: 'started_at', valueType: 'dateTime', search: false, width: 160 },
    { title: '结束时间', dataIndex: 'finished_at', valueType: 'dateTime', search: false, width: 160 },
    {
      title: '操作', valueType: 'option', width: 160,
      render: (_: any, record: any) => [
        (record.status === 'pending' || record.status === 'failed' || record.status === 'completed') && (
          <a key="run" onClick={() => handleRunTask(record)}>
            {runningId === record.id ? '执行中…' : <><PlayCircleOutlined /> 执行</>}
          </a>
        ),
        (record.report?.hosts?.length > 0) && (
          <a key="view" onClick={() => { setResultTask(record); setResultDrawer(true); }}>
            <EyeOutlined /> 查看结果
          </a>
        ),
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteInspectionTask(record.id);
          message.success('已删除');
          taskRef.current?.reload();
        }}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ].filter(Boolean),
    },
  ];

  return (
    <PageContainer>
      <Tabs defaultActiveKey="tasks" items={[
        {
          key: 'tasks',
          label: '巡检任务',
          children: (
            <ProTable
              headerTitle="巡检任务"
              actionRef={taskRef}
              rowKey="id"
              search={false}
              toolBarRender={() => [
                <Button type="primary" key="add" onClick={() => setTaskCreateOpen(true)}>
                  <PlusOutlined /> 新建任务
                </Button>,
              ]}
              request={async (params) => {
                const { current: page = 1, pageSize = 20 } = params;
                const res: any = await getInspectionTasks({ skip: (page - 1) * pageSize, limit: pageSize });
                return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
              }}
              columns={taskColumns}
            />
          ),
        },
        {
          key: 'templates',
          label: '巡检模板',
          children: (
            <ProTable
              headerTitle="巡检模板"
              actionRef={tmplRef}
              rowKey="id"
              search={false}
              toolBarRender={() => [
                <Button type="primary" key="add" onClick={() => { setEditingTmpl(null); setTmplCreateOpen(true); }}>
                  <PlusOutlined /> 新建模板
                </Button>,
              ]}
              request={async (params) => {
                const { current: page = 1, pageSize = 20 } = params;
                const res: any = await getInspectionTemplates({ skip: (page - 1) * pageSize, limit: pageSize });
                return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
              }}
              columns={templateColumns}
            />
          ),
        },
      ]} />

      {/* 模板创建/编辑 */}
      <ModalForm
        title={editingTmpl ? '编辑巡检模板' : '新建巡检模板'}
        width={640}
        open={tmplCreateOpen}
        onOpenChange={(v) => { setTmplCreateOpen(v); if (!v) setEditingTmpl(null); }}
        initialValues={editingTmpl}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (editingTmpl) {
            await updateInspectionTemplate(editingTmpl.id, values);
            message.success('更新成功');
          } else {
            await createInspectionTemplate(values);
            message.success('创建成功');
          }
          setTmplCreateOpen(false);
          setEditingTmpl(null);
          tmplRef.current?.reload();
          getInspectionTemplates({ limit: 200 }).then((res: any) => { if (Array.isArray(res)) setTemplates(res); });
        }}
      >
        <ProFormText name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]} />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 2 }} />
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#666' }}>快速选择预设脚本：</span>
          <Space size={4} wrap style={{ marginTop: 6 }}>
            {PRESET_SCRIPTS.map(p => (
              <Button
                key={p.label}
                size="small"
                onClick={() => {
                  message.info(`请手动粘贴脚本：${p.label}`);
                }}
              >
                {p.label}
              </Button>
            ))}
          </Space>
        </div>
        <ProFormTextArea
          name="script"
          label="巡检脚本"
          rules={[{ required: true, message: '请输入巡检脚本' }]}
          fieldProps={{ rows: 10, style: { fontFamily: 'monospace', fontSize: 12 } }}
          placeholder={PRESET_SCRIPTS[0].script}
        />
        <ProFormSelect
          name="enabled"
          label="状态"
          initialValue={true}
          options={[{ label: '启用', value: true }, { label: '禁用', value: false }]}
        />
      </ModalForm>

      {/* 任务创建 */}
      <ModalForm
        title="新建巡检任务"
        width={520}
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          await createInspectionTask({ ...values, targets: values.targets || [] });
          message.success('任务创建成功，点击「执行」开始巡检');
          setTaskCreateOpen(false);
          taskRef.current?.reload();
        }}
      >
        <ProFormText name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]} />
        <ProFormSelect
          name="template_id"
          label="巡检模板"
          rules={[{ required: true, message: '请选择巡检模板' }]}
          options={templates.map(t => ({ label: t.name, value: t.id }))}
          placeholder="选择要使用的巡检模板"
        />
        <ProFormSelect
          name="targets"
          label="目标资产"
          rules={[{ required: true, message: '请选择至少一台目标资产' }]}
          mode="multiple"
          options={assets}
          placeholder="选择要巡检的主机（需已绑定 SSH 凭证）"
          extra="⚠️ 标注「无凭证」的资产无法登录，巡检会失败"
        />
      </ModalForm>

      {/* 巡检结果 Drawer */}
      <Drawer
        title={`巡检结果 — ${resultTask?.name || ''}`}
        width={680}
        open={resultDrawer}
        onClose={() => { setResultDrawer(false); setResultTask(null); }}
        extra={
          resultTask?.report && (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>{resultTask.report.success_count}/{resultTask.report.total} 台成功</span>
            </Space>
          )
        }
      >
        {resultTask?.report?.hosts && (
          <Collapse
            accordion={false}
            items={resultTask.report.hosts.map((host: any, idx: number) => ({
              key: idx,
              label: (
                <Space>
                  {host.success
                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  <strong>{host.name}</strong>
                  <Text type="secondary">{host.ip}</Text>
                </Space>
              ),
              children: (
                <div>
                  {host.stdout && (
                    <pre style={{ background: '#f6ffed', padding: 12, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
                      {host.stdout}
                    </pre>
                  )}
                  {host.stderr && (
                    <pre style={{ background: '#fff2f0', padding: 12, borderRadius: 4, fontSize: 12, color: '#cf1322', whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      {host.stderr}
                    </pre>
                  )}
                  {!host.stdout && !host.stderr && <Text type="secondary">无输出</Text>}
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Inspections;
