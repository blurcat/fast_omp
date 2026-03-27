import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Pie, Column } from '@ant-design/plots';
import { DatabaseOutlined, CloudServerOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { getDashboardStats } from '../../services/dashboard';

const PROVIDER_LABELS: Record<string, string> = {
  aliyun: '阿里云',
  aws: 'AWS',
  tencent: '腾讯云',
  local: '本地IDC',
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    total: 0,
    active_hosts: 0,
    cloud_resources: 0,
    by_type: [],
    by_provider: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getDashboardStats();
        setData(res);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const typeConfig = {
    data: data.by_type,
    angleField: 'count',
    colorField: 'type',
    radius: 0.82,
    innerRadius: 0.62,
    label: {
      text: (d: any) => `${d.type}  ${d.count}`,
      position: 'outside',
      style: { fontSize: 12 },
    },
    tooltip: { items: [{ field: 'count', name: '数量' }] },
    legend: { position: 'bottom' },
  };

  const providerData = data.by_provider.map((item: any) => ({
    ...item,
    label: PROVIDER_LABELS[item.provider] || item.provider,
  }));

  const providerConfig = {
    data: providerData,
    xField: 'label',
    yField: 'count',
    colorField: 'label',
    style: { maxWidth: 52 },
    label: {
      text: 'count',
      position: 'inside',
      style: { fill: '#fff', fontSize: 13, fontWeight: 600 },
    },
    axis: {
      x: { title: false },
      y: { title: false, gridLineDash: [4, 4] },
    },
    tooltip: { items: [{ field: 'count', name: '资产数量' }] },
    legend: false,
  };

  return (
    <PageContainer loading={loading} header={{ title: '仪表盘', subTitle: '系统资源概览' }}>
      {/* 统计卡片 */}
      <ProCard gutter={[16, 16]} ghost>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
          <StatisticCard
            statistic={{
              title: '资产总数',
              value: data.total,
              icon: <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff', background: '#e6f7ff', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
          <StatisticCard
            statistic={{
              title: '活跃资产',
              value: data.active_hosts,
              icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', background: '#f6ffed', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
          <StatisticCard
            statistic={{
              title: '告警数量',
              value: 0,
              icon: <WarningOutlined style={{ fontSize: 24, color: '#faad14', background: '#fffbe6', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
          <StatisticCard
            statistic={{
              title: '云资源',
              value: data.cloud_resources,
              icon: <CloudServerOutlined style={{ fontSize: 24, color: '#722ed1', background: '#f9f0ff', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
      </ProCard>

      {/* 图表区 */}
      <ProCard gutter={[16, 16]} ghost style={{ marginTop: 16 }}>
        <ProCard title="资产类型分布" colSpan={{ xs: 24, md: 12 }} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {data.by_type.length > 0
            ? <Pie {...typeConfig} height={300} />
            : <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>暂无数据</div>}
        </ProCard>
        <ProCard title="云厂商/来源分布" colSpan={{ xs: 24, md: 12 }} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          {providerData.length > 0
            ? <Column {...providerConfig} height={300} />
            : <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>暂无数据</div>}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};

export default Dashboard;
