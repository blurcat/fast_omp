import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Tabs } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  getInspectionTemplates, createInspectionTemplate, deleteInspectionTemplate,
  getInspectionTasks, createInspectionTask, runInspectionTask, deleteInspectionTask,
} from '../../services/inspections';

const Inspections: React.FC = () => {
  const tmplRef = useRef<ActionType | undefined>(undefined);
  const taskRef = useRef<ActionType | undefined>(undefined);
  const [tmplCreateOpen, setTmplCreateOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);

  const loadTemplates = async () => {
    await getInspectionTemplates({ limit: 200 });
  };

  React.useEffect(() => { loadTemplates(); }, []);

  const templateColumns: ProColumns[] = [
    { title: '模板名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', search: false, ellipsis: true },
    { title: 'Cron', dataIndex: 'schedule', search: false },
    { title: '创建人', dataIndex: 'created_by', search: false },
    {
      title: '状态', dataIndex: 'enabled', search: false,
      render: (_, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteInspectionTemplate(record.id);
          message.success('已删除');
          tmplRef.current?.reload();
        }}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  const statusMap: any = {
    pending: { text: '等待', color: 'default' },
    running: { text: '执行中', color: 'processing' },
    completed: { text: '完成', color: 'success' },
    failed: { text: '失败', color: 'error' },
  };

  const taskColumns: ProColumns[] = [
    { title: '任务名称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status', render: (_, r: any) => <Tag color={statusMap[r.status]?.color}>{statusMap[r.status]?.text}</Tag> },
    { title: '创建人', dataIndex: 'created_by', search: false },
    { title: '开始时间', dataIndex: 'started_at', valueType: 'dateTime', search: false },
    { title: '结束时间', dataIndex: 'finished_at', valueType: 'dateTime', search: false },
    {
      title: '操作', valueType: 'option',
      render: (_, record: any) => [
        record.status === 'pending' && (
          <a key="run" onClick={async () => {
            await runInspectionTask(record.id);
            message.success('巡检完成');
            taskRef.current?.reload();
          }}>
            <PlayCircleOutlined /> 执行
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
                <Button type="primary" key="add" onClick={() => setTmplCreateOpen(true)}>
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

      <ModalForm title="新建巡检模板" open={tmplCreateOpen} onOpenChange={setTmplCreateOpen}
        onFinish={async (values) => {
          await createInspectionTemplate(values);
          message.success('创建成功');
          setTmplCreateOpen(false);
          tmplRef.current?.reload();
          loadTemplates();
        }}>
        <ProFormText name="name" label="模板名称" rules={[{ required: true }]} />
        <ProFormText name="description" label="描述" />
        <ProFormTextArea name="script" label="巡检脚本" fieldProps={{ rows: 6, style: { fontFamily: 'monospace' } }} />
        <ProFormText name="schedule" label="定时表达式(Cron)" placeholder="0 9 * * *" />
      </ModalForm>

      <ModalForm title="新建巡检任务" open={taskCreateOpen} onOpenChange={setTaskCreateOpen}
        onFinish={async (values) => {
          await createInspectionTask(values);
          message.success('创建成功');
          setTaskCreateOpen(false);
          taskRef.current?.reload();
        }}>
        <ProFormText name="name" label="任务名称" rules={[{ required: true }]} />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default Inspections;
