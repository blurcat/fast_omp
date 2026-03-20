import React, { useRef } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { message, Tag } from 'antd';
import { getAlertEvents, acknowledgeAlertEvent, resolveAlertEvent } from '../../../services/monitor';

const AlertEvents: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);

  const statusMap: any = {
    firing: { text: '告警中', color: 'red' },
    resolved: { text: '已恢复', color: 'green' },
    acknowledged: { text: '已确认', color: 'orange' },
  };
  const severityMap: any = {
    info: { text: '信息', color: 'blue' },
    warning: { text: '警告', color: 'orange' },
    critical: { text: '严重', color: 'red' },
  };

  const columns: ProColumns[] = [
    { title: '资源', dataIndex: 'resource_name', search: false },
    { title: '指标', dataIndex: 'metric', search: false },
    {
      title: '当前值 / 阈值', search: false,
      render: (_, r: any) => `${r.value} / ${r.threshold}`,
    },
    {
      title: '严重级别', dataIndex: 'severity',
      render: (_, r: any) => <Tag color={severityMap[r.severity]?.color}>{severityMap[r.severity]?.text || r.severity}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status',
      render: (_, r: any) => <Tag color={statusMap[r.status]?.color}>{statusMap[r.status]?.text || r.status}</Tag>,
    },
    { title: '告警开始', dataIndex: 'started_at', valueType: 'dateTime', search: false },
    { title: '恢复时间', dataIndex: 'resolved_at', valueType: 'dateTime', search: false },
    {
      title: '操作', valueType: 'option',
      render: (_, record: any) => [
        record.status === 'firing' && (
          <a key="ack" onClick={async () => {
            await acknowledgeAlertEvent(record.id);
            message.success('已确认');
            actionRef.current?.reload();
          }}>确认</a>
        ),
        record.status !== 'resolved' && (
          <a key="resolve" onClick={async () => {
            await resolveAlertEvent(record.id);
            message.success('已手动恢复');
            actionRef.current?.reload();
          }}>标记恢复</a>
        ),
      ].filter(Boolean),
    },
  ];

  return (
    <PageContainer>
      <ProTable
        headerTitle="告警事件"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 100 }}
        request={async (params) => {
          const { current: page = 1, pageSize = 20, status, severity } = params;
          const res: any = await getAlertEvents({
            skip: (page - 1) * pageSize,
            limit: pageSize,
            status,
            severity,
          });
          return { data: Array.isArray(res) ? res : [], success: true, total: Array.isArray(res) ? res.length : 0 };
        }}
        columns={columns}
      />
    </PageContainer>
  );
};

export default AlertEvents;
