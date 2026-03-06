import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Pie, Column } from '@ant-design/plots';
import { DatabaseOutlined, CloudServerOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { getDashboardStats } from '../../services/dashboard';

const { Statistic } = StatisticCard;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    total: 0,
    by_type: [],
    by_provider: [],
    by_status: []
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
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      text: (d: any) => `${d.type}: ${d.count}`,
      position: 'outside',
    },
    legend: {
      position: 'bottom',
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  const providerConfig = {
    data: data.by_provider,
    xField: 'provider',
    yField: 'count',
    color: '#2f54eb',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
  };

  return (
    <PageContainer loading={loading} header={{ title: '仪表盘', subTitle: '系统资源概览' }}>
      <ProCard gutter={[16, 16]} ghost>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
          <StatisticCard
            statistic={{
              title: '总资产数量',
              value: data.total,
              icon: <DatabaseOutlined style={{ fontSize: 24, color: '#1890ff', background: '#e6f7ff', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
        <ProCard colSpan={{ xs: 24, sm: 12, md: 6 }}>
           <StatisticCard
            statistic={{
              title: '活跃主机',
              value: data.total > 0 ? Math.floor(data.total * 0.8) : 0, // 模拟数据
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
              value: data.by_provider.length,
              icon: <CloudServerOutlined style={{ fontSize: 24, color: '#722ed1', background: '#f9f0ff', padding: 8, borderRadius: '50%' }} />,
            }}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          />
        </ProCard>
      </ProCard>

      <ProCard gutter={[16, 16]} ghost style={{ marginTop: 16 }}>
        <ProCard title="资产类型分布" colSpan={{ xs: 24, md: 12 }} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
           {data.by_type.length > 0 ? <Pie {...typeConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>}
        </ProCard>
        <ProCard title="云厂商分布" colSpan={{ xs: 24, md: 12 }} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
           {data.by_provider.length > 0 ? <Column {...providerConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};

export default Dashboard;
