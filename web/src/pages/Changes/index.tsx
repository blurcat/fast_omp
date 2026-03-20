import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDateTimePicker, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Modal, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getChanges, createChange, updateChange, deleteChange, submitChange, approveChange, rejectChange } from '../../services/changes';

const Changes: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<any>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const statusMap: any = {
    draft: { text: '草稿', color: 'default' },
    pending: { text: '待审批', color: 'processing' },
    approved: { text: '已批准', color: 'success' },
    rejected: { text: '已拒绝', color: 'error' },
    executing: { text: '执行中', color: 'warning' },
    completed: { text: '已完成', color: 'success' },
    cancelled: { text: '已取消', color: 'default' },
  };
  const riskMap: any = {
    low: { text: '低', color: 'green' },
    medium: { text: '中', color: 'orange' },
    high: { text: '高', color: 'red' },
  };

  const columns: ProColumns[] = [
    { title: '变更标题', dataIndex: 'title', copyable: true },
    { title: '类型', dataIndex: 'type', search: false, render: (_, r: any) => ({ normal: '普通', emergency: '紧急', standard: '标准' } as Record<string, string>)[r.type] || r.type },
    { title: '风险', dataIndex: 'risk_level', search: false, render: (_, r: any) => <Tag color={riskMap[r.risk_level]?.color}>{riskMap[r.risk_level]?.text}</Tag> },
    { title: '状态', dataIndex: 'status', render: (_, r: any) => <Tag color={statusMap[r.status]?.color}>{statusMap[r.status]?.text || r.status}</Tag> },
    { title: '创建人', dataIndex: 'created_by', search: false },
    { title: '审批人', dataIndex: 'approver_name', search: false },
    { title: '计划时间', dataIndex: 'scheduled_at', valueType: 'dateTime', search: false },
    {
      title: '操作', valueType: 'option',
      render: (_, record: any) => [
        record.status === 'draft' && (
          <a key="submit" onClick={async () => {
            await submitChange(record.id);
            message.success('已提交审批');
            actionRef.current?.reload();
          }}>提交</a>
        ),
        record.status === 'pending' && (
          <a key="approve" onClick={async () => {
            await approveChange(record.id);
            message.success('已批准');
            actionRef.current?.reload();
          }}>批准</a>
        ),
        record.status === 'pending' && (
          <a key="reject" style={{ color: 'orange' }} onClick={() => { setCurrent(record); setRejectOpen(true); }}>拒绝</a>
        ),
        record.status === 'draft' && (
          <a key="edit" onClick={() => { setCurrent(record); setEditOpen(true); }}>编辑</a>
        ),
        (record.status === 'draft' || record.status === 'cancelled') && (
          <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
            await deleteChange(record.id);
            message.success('已删除');
            actionRef.current?.reload();
          }}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        ),
      ].filter(Boolean),
    },
  ];

  const FormFields = () => (
    <>
      <ProFormText name="title" label="变更标题" rules={[{ required: true }]} />
      <ProFormSelect name="type" label="变更类型" options={[
        { label: '普通变更', value: 'normal' },
        { label: '紧急变更', value: 'emergency' },
        { label: '标准变更', value: 'standard' },
      ]} initialValue="normal" />
      <ProFormSelect name="risk_level" label="风险级别" options={[
        { label: '低风险', value: 'low' },
        { label: '中风险', value: 'medium' },
        { label: '高风险', value: 'high' },
      ]} initialValue="medium" />
      <ProFormTextArea name="description" label="变更描述" fieldProps={{ rows: 4 }} />
      <ProFormTextArea name="plan" label="变更方案" fieldProps={{ rows: 4 }} />
      <ProFormTextArea name="rollback_plan" label="回滚方案" fieldProps={{ rows: 4 }} />
      <ProFormDateTimePicker name="scheduled_at" label="计划执行时间" />
    </>
  );

  return (
    <PageContainer>
      <ProTable
        headerTitle="变更管理"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 80 }}
        toolBarRender={() => [
          <Button type="primary" key="add" onClick={() => setCreateOpen(true)}>
            <PlusOutlined /> 新建变更
          </Button>,
        ]}
        request={async (params) => {
          const { current: page = 1, pageSize = 20, status } = params;
          const res: any = await getChanges({ skip: (page - 1) * pageSize, limit: pageSize, status });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ModalForm title="新建变更" open={createOpen} onOpenChange={setCreateOpen}
        onFinish={async (values) => {
          await createChange(values);
          message.success('创建成功');
          setCreateOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      <ModalForm title="编辑变更" open={editOpen} onOpenChange={setEditOpen}
        initialValues={current}
        modalProps={{ destroyOnHidden: true }}
        onFinish={async (values) => {
          await updateChange(current.id, values);
          message.success('更新成功');
          setEditOpen(false);
          actionRef.current?.reload();
        }}>
        <FormFields />
      </ModalForm>

      <Modal
        title="拒绝变更"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={async () => {
          await rejectChange(current.id, rejectNotes);
          message.success('已拒绝');
          setRejectOpen(false);
          setRejectNotes('');
          actionRef.current?.reload();
        }}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入拒绝原因"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </Modal>
    </PageContainer>
  );
};

export default Changes;
