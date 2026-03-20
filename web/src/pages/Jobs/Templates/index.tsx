import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormDigit, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getJobTemplates, createJobTemplate, updateJobTemplate, deleteJobTemplate } from '../../../services/jobs';
import ExecuteModal from '../ExecuteModal';

const JobTemplates: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [current, setCurrent] = useState<any>();

  const columns: ProColumns[] = [
    { title: '模板名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', search: false, ellipsis: true },
    {
      title: '超时(秒)', dataIndex: 'timeout', search: false,
      render: (v: any) => `${v}s`,
    },
    { title: '创建人', dataIndex: 'created_by', search: false },
    {
      title: '状态', dataIndex: 'enabled', search: false,
      render: (_, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <a key="run" onClick={() => { setCurrent(record); setExecuteOpen(true); }}>
          <PlayCircleOutlined /> 执行
        </a>,
        <a key="edit" onClick={() => { setCurrent(record); setEditOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteJobTemplate(record.id);
          message.success('已删除');
          actionRef.current?.reload();
        }}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  const FormFields = () => (
    <>
      <ProFormText name="name" label="模板名称" rules={[{ required: true }]} />
      <ProFormText name="description" label="描述" />
      <ProFormTextArea name="script" label="脚本内容" rules={[{ required: true }]}
        fieldProps={{ rows: 8, style: { fontFamily: 'monospace' } }} />
      <ProFormDigit name="timeout" label="超时时间(秒)" initialValue={300} />
    </>
  );

  return (
    <PageContainer>
      <ProTable
        headerTitle="作业模板"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 100 }}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={() => setCreateOpen(true)}>
            <PlusOutlined /> 新建模板
          </Button>,
        ]}
        request={async (params) => {
          const { current: page = 1, pageSize = 20 } = params;
          const res: any = await getJobTemplates({ skip: (page - 1) * pageSize, limit: pageSize });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ModalForm title="新建作业模板" open={createOpen} onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createJobTemplate(values);
          message.success('创建成功');
          setCreateOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      <ModalForm title="编辑作业模板" open={editOpen} onOpenChange={setEditOpen}
        initialValues={current}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          await updateJobTemplate(current.id, values);
          message.success('更新成功');
          setEditOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      {executeOpen && current && (
        <ExecuteModal
          template={current}
          open={executeOpen}
          onClose={() => setExecuteOpen(false)}
        />
      )}
    </PageContainer>
  );
};

export default JobTemplates;
