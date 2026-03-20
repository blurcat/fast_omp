import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, LockOutlined } from '@ant-design/icons';
import { getCredentials, createCredential, updateCredential, deleteCredential } from '../../services/credentials';

const Credentials: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<any>();

  const typeMap: any = {
    ssh_password: { text: 'SSH密码', color: 'blue' },
    ssh_key: { text: 'SSH密钥', color: 'purple' },
    api_token: { text: 'API Token', color: 'orange' },
    database: { text: '数据库', color: 'green' },
  };

  const columns: ProColumns[] = [
    { title: '凭证名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (_, r: any) => <Tag color={typeMap[r.type]?.color}>{typeMap[r.type]?.text || r.type}</Tag> },
    { title: '用户名', dataIndex: 'username', search: false },
    { title: '描述', dataIndex: 'description', search: false, ellipsis: true },
    { title: '创建人', dataIndex: 'created_by', search: false },
    {
      title: '状态', dataIndex: 'enabled', search: false,
      render: (_, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <a key="edit" onClick={() => { setCurrent(record); setEditOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteCredential(record.id);
          message.success('已删除');
          actionRef.current?.reload();
        }}>
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle={<><LockOutlined /> 凭证管理</>}
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 80 }}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={() => setCreateOpen(true)}>
            <PlusOutlined /> 新建凭证
          </Button>,
        ]}
        request={async (params) => {
          const { current: page = 1, pageSize = 20 } = params;
          const res: any = await getCredentials({ skip: (page - 1) * pageSize, limit: pageSize });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ModalForm title="新建凭证" open={createOpen} onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createCredential(values);
          message.success('创建成功');
          setCreateOpen(false);
          actionRef.current?.reload();
        }}>
        <ProFormText name="name" label="凭证名称" rules={[{ required: true }]} />
        <ProFormSelect name="type" label="凭证类型" options={[
          { label: 'SSH密码', value: 'ssh_password' },
          { label: 'SSH密钥', value: 'ssh_key' },
          { label: 'API Token', value: 'api_token' },
          { label: '数据库密码', value: 'database' },
        ]} rules={[{ required: true }]} />
        <ProFormText name="username" label="用户名" />
        <ProFormText name="secret" label="密码/密钥/Token" rules={[{ required: true }]}
          fieldProps={{ type: 'password' }} />
        <ProFormText name="description" label="描述" />
      </ModalForm>

      <ModalForm title="编辑凭证" open={editOpen} onOpenChange={setEditOpen}
        initialValues={current}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          await updateCredential(current.id, values);
          message.success('更新成功');
          setEditOpen(false);
          actionRef.current?.reload();
        }}>
        <ProFormText name="name" label="凭证名称" rules={[{ required: true }]} />
        <ProFormSelect name="type" label="凭证类型" options={[
          { label: 'SSH密码', value: 'ssh_password' },
          { label: 'SSH密钥', value: 'ssh_key' },
          { label: 'API Token', value: 'api_token' },
          { label: '数据库密码', value: 'database' },
        ]} />
        <ProFormText name="username" label="用户名" />
        <ProFormText name="secret" label="新密码/密钥（留空不修改）" fieldProps={{ type: 'password' }} />
        <ProFormText name="description" label="描述" />
      </ModalForm>
    </PageContainer>
  );
};

export default Credentials;
