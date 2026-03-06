import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { Pie, Column } from '@ant-design/plots';
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
    label: {
      text: (d: any) => `${d.type}: ${d.count}`,
      position: 'outside',
    },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 5,
      },
    },
  };

  const providerConfig = {
    data: data.by_provider,
    xField: 'provider',
    yField: 'count',
    label: {
      position: 'inside',
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
    <PageContainer loading={loading}>
      <ProCard gutter={16} ghost>
        <ProCard colSpan={24} style={{ marginBottom: 16 }}>
          <StatisticCard
            statistic={{
              title: '总资产数量',
              value: data.total,
              description: <Statistic title="较昨日" value="0" trend="up" />,
            }}
          />
        </ProCard>
      </ProCard>

      <ProCard gutter={16} ghost>
        <ProCard title="资产类型分布" colSpan={12}>
           {data.by_type.length > 0 ? <Pie {...typeConfig} /> : <div>暂无数据</div>}
        </ProCard>
        <ProCard title="云厂商分布" colSpan={12}>
           {data.by_provider.length > 0 ? <Column {...providerConfig} /> : <div>暂无数据</div>}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};

export default Dashboard;
