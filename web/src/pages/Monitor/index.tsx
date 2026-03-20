import React, { useState, useEffect } from 'react';
import { PageContainer, StatisticCard } from '@ant-design/pro-components';
import { Row, Col, Card, Badge, List, Button, message } from 'antd';
import { AlertOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getAlertEvents, triggerEvaluation } from '../../services/monitor';

const MonitorDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    const res: any = await getAlertEvents({ limit: 20 });
    if (Array.isArray(res)) setEvents(res);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const firing = events.filter((e) => e.status === 'firing').length;
  const acknowledged = events.filter((e) => e.status === 'acknowledged').length;
  const resolved = events.filter((e) => e.status === 'resolved').length;

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res: any = await triggerEvaluation();
      message.success(`评估完成，触发 ${res.fired_alerts} 条新告警`);
      fetchEvents();
    } finally {
      setLoading(false);
    }
  };

  const severityColor: any = { critical: 'red', warning: 'orange', info: 'blue' };

  return (
    <PageContainer
      extra={
        <Button type="primary" loading={loading} onClick={handleEvaluate}>
          立即评估规则
        </Button>
      }
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: '告警中',
              value: firing,
              icon: <AlertOutlined style={{ color: '#ff4d4f' }} />,
              valueStyle: { color: '#ff4d4f' },
            }}
          />
        </Col>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: '已确认',
              value: acknowledged,
              icon: <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />,
              valueStyle: { color: '#fa8c16' },
            }}
          />
        </Col>
        <Col span={8}>
          <StatisticCard
            statistic={{
              title: '已恢复',
              value: resolved,
              icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
              valueStyle: { color: '#52c41a' },
            }}
          />
        </Col>
      </Row>

      <Card title="最近告警事件" bodyStyle={{ padding: 0 }}>
        <List
          dataSource={events.slice(0, 10)}
          renderItem={(item: any) => (
            <List.Item style={{ padding: '12px 24px' }}>
              <List.Item.Meta
                avatar={<Badge color={severityColor[item.severity] || 'blue'} />}
                title={`${item.resource_name || `资源 #${item.resource_id}`} - ${item.metric}`}
                description={`值: ${item.value} | 阈值: ${item.threshold} | ${new Date(item.started_at).toLocaleString()}`}
              />
              <Badge
                status={item.status === 'firing' ? 'error' : item.status === 'acknowledged' ? 'warning' : 'success'}
                text={item.status === 'firing' ? '告警中' : item.status === 'acknowledged' ? '已确认' : '已恢复'}
              />
            </List.Item>
          )}
        />
      </Card>
    </PageContainer>
  );
};

export default MonitorDashboard;
