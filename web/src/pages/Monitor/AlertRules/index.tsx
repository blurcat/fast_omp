import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormDigit, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, getAlertChannels } from '../../../services/monitor';

const AlertRules: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<any>();
  const [channels, setChannels] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    getAlertChannels().then((res: any) => {
      if (Array.isArray(res)) {
        setChannels(res.map((c: any) => ({ label: c.name, value: c.id })));
      }
    });
  }, []);

  const severityMap: any = {
    info: { text: '信息', color: 'blue' },
    warning: { text: '警告', color: 'orange' },
    critical: { text: '严重', color: 'red' },
  };

  const columns: ProColumns[] = [
    { title: '规则名称', dataIndex: 'name', copyable: true },
    { title: '指标', dataIndex: 'metric', search: false },
    {
      title: '条件', search: false,
      render: (_, r: any) => `${r.metric} ${r.operator} ${r.threshold} (持续${r.duration_minutes}分钟)`,
    },
    {
      title: '严重级别', dataIndex: 'severity', search: false,
      render: (_, r: any) => <Tag color={severityMap[r.severity]?.color}>{severityMap[r.severity]?.text || r.severity}</Tag>,
    },
    {
      title: '启用', dataIndex: 'enabled', search: false,
      render: (_, r: any) => <Tag color={r.enabled ? 'green' : 'default'}>{r.enabled ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <a key="edit" onClick={() => { setCurrent(record); setEditOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          await deleteAlertRule(record.id);
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
      <ProFormText name="name" label="规则名称" rules={[{ required: true }]} />
      <ProFormText name="description" label="描述" />
      <ProFormSelect name="metric" label="监控指标" options={[
        { label: 'CPU使用率', value: 'cpu_usage' },
        { label: '内存使用率', value: 'mem_usage' },
        { label: '磁盘使用率', value: 'disk_usage' },
        { label: '网络流量', value: 'net_in' },
      ]} rules={[{ required: true }]} />
      <ProFormSelect name="operator" label="比较符" options={[
        { label: '大于 >', value: '>' },
        { label: '小于 <', value: '<' },
        { label: '大于等于 >=', value: '>=' },
        { label: '小于等于 <=', value: '<=' },
      ]} rules={[{ required: true }]} />
      <ProFormDigit name="threshold" label="阈值" rules={[{ required: true }]} />
      <ProFormDigit name="duration_minutes" label="持续时间(分钟)" initialValue={5} />
      <ProFormSelect name="severity" label="严重级别" options={[
        { label: '信息', value: 'info' },
        { label: '警告', value: 'warning' },
        { label: '严重', value: 'critical' },
      ]} initialValue="warning" />
      <ProFormSelect name="channel_ids" label="通知渠道" mode="multiple" options={channels} />
    </>
  );

  return (
    <PageContainer>
      <ProTable
        headerTitle="告警规则"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 100 }}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={() => setCreateOpen(true)}>
            <PlusOutlined /> 新建规则
          </Button>,
        ]}
        request={async (params) => {
          const { current: page = 1, pageSize = 20 } = params;
          const res: any = await getAlertRules({ skip: (page - 1) * pageSize, limit: pageSize });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ModalForm title="新建告警规则" open={createOpen} onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createAlertRule(values);
          message.success('创建成功');
          setCreateOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      <ModalForm title="编辑告警规则" open={editOpen} onOpenChange={setEditOpen}
        initialValues={current}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          await updateAlertRule(current.id, values);
          message.success('更新成功');
          setEditOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>
    </PageContainer>
  );
};

export default AlertRules;
