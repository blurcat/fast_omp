import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAlertChannels, createAlertChannel, updateAlertChannel, deleteAlertChannel } from '../../../services/monitor';

const Channels: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<any>();

  const columns: ProColumns[] = [
    { title: '渠道名称', dataIndex: 'name' },
    {
      title: '类型', dataIndex: 'type', search: false,
      render: (_, r: any) => {
        const m: any = { dingtalk: { text: '钉钉', color: 'blue' }, webhook: { text: 'Webhook', color: 'purple' }, email: { text: '邮件', color: 'green' } };
        return <Tag color={m[r.type]?.color}>{m[r.type]?.text || r.type}</Tag>;
      },
    },
    { title: '描述', dataIndex: 'description', search: false },
    {
      title: '状态', dataIndex: 'enabled', search: false,
      render: (_, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <a key="edit" onClick={() => { setCurrent(record); setEditOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteAlertChannel(record.id);
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
      <ProFormText name="name" label="渠道名称" rules={[{ required: true }]} />
      <ProFormSelect name="type" label="渠道类型" options={[
        { label: '钉钉机器人', value: 'dingtalk' },
        { label: 'Webhook', value: 'webhook' },
        { label: '邮件', value: 'email' },
      ]} rules={[{ required: true }]} />
      <ProFormText name={['config', 'webhook_url']} label="Webhook URL" placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
      <ProFormText name={['config', 'token']} label="加签密钥（钉钉）" />
      <ProFormText name={['config', 'emails']} label="收件人邮箱（逗号分隔）" />
      <ProFormText name="description" label="描述" />
    </>
  );

  return (
    <PageContainer>
      <ProTable
        headerTitle="通知渠道"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={() => setCreateOpen(true)}>
            <PlusOutlined /> 新建渠道
          </Button>,
        ]}
        request={async () => {
          const res: any = await getAlertChannels();
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ModalForm title="新建通知渠道" open={createOpen} onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createAlertChannel(values);
          message.success('创建成功');
          setCreateOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      <ModalForm title="编辑通知渠道" open={editOpen} onOpenChange={setEditOpen}
        initialValues={current}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          await updateAlertChannel(current.id, values);
          message.success('更新成功');
          setEditOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>
    </PageContainer>
  );
};

export default Channels;
