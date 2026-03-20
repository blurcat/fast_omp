import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Tag, Drawer, Table, Descriptions } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { getJobExecutions, getJobExecution } from '../../../services/jobs';
import ExecuteModal from '../ExecuteModal';

const JobExecutions: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statusMap: any = {
    pending: { text: '等待', color: 'default' },
    running: { text: '执行中', color: 'processing' },
    completed: { text: '完成', color: 'success' },
    failed: { text: '失败', color: 'error' },
    cancelled: { text: '已取消', color: 'warning' },
  };

  const columns: ProColumns[] = [
    { title: '执行名称', dataIndex: 'name' },
    {
      title: '状态', dataIndex: 'status',
      render: (_, r: any) => <Tag color={statusMap[r.status]?.color}>{statusMap[r.status]?.text || r.status}</Tag>,
    },
    {
      title: '结果', search: false,
      render: (_, r: any) => r.summary?.total
        ? `成功 ${r.summary.success}/${r.summary.total}`
        : '-',
    },
    { title: '创建人', dataIndex: 'created_by', search: false },
    { title: '开始时间', dataIndex: 'started_at', valueType: 'dateTime', search: false },
    { title: '结束时间', dataIndex: 'finished_at', valueType: 'dateTime', search: false },
    {
      title: '操作', valueType: 'option',
      render: (_, record) => [
        <a key="detail" onClick={async () => {
          const res = await getJobExecution(record.id);
          setDetail(res);
          setDrawerOpen(true);
        }}>详情</a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle="执行记录"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button type="primary" key="run" onClick={() => setExecuteOpen(true)}>
            <PlayCircleOutlined /> 新建执行
          </Button>,
        ]}
        request={async (params) => {
          const { current: page = 1, pageSize = 20 } = params;
          const res: any = await getJobExecutions({ skip: (page - 1) * pageSize, limit: pageSize });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />

      <ExecuteModal open={executeOpen} onClose={() => { setExecuteOpen(false); actionRef.current?.reload(); }} />

      <Drawer title="执行详情" width={700} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="成功/总计">{detail.summary?.success}/{detail.summary?.total}</Descriptions.Item>
              <Descriptions.Item label="创建人">{detail.created_by}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="id"
              dataSource={detail.logs || []}
              columns={[
                { title: '主机', dataIndex: 'host' },
                { title: '状态', dataIndex: 'status', render: (v: any) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v}</Tag> },
                { title: '退出码', dataIndex: 'exit_code' },
                { title: '输出', dataIndex: 'stdout', ellipsis: true },
                { title: '错误', dataIndex: 'stderr', ellipsis: true },
              ]}
            />
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default JobExecutions;
