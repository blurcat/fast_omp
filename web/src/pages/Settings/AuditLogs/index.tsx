import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns, ProDescriptions } from '@ant-design/pro-components';
import { Drawer } from 'antd';
import { getAuditLogs } from '../../../services/audit';
import type { AuditLog } from '../../../types';

// Extract valueEnums for reuse
const actionEnum = {
  create: { text: '创建', status: 'Success' },
  update: { text: '更新', status: 'Warning' },
  delete: { text: '删除', status: 'Error' },
  login: { text: '登录', status: 'Default' },
};

const targetTypeEnum = {
  asset: { text: '资产' },
  menu: { text: '菜单' },
  role: { text: '角色' },
  user: { text: '用户' },
};

const AuditLogs: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<AuditLog>();

  const columns: ProColumns<AuditLog>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '用户',
      dataIndex: 'username',
      copyable: true,
    },
    {
      title: '操作',
      dataIndex: 'action',
      valueType: 'select',
      valueEnum: actionEnum,
    },
    {
      title: '对象类型',
      dataIndex: 'target_type',
      valueType: 'select',
      valueEnum: targetTypeEnum,
    },
    {
      title: '对象ID',
      dataIndex: 'target_id',
      search: false,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="detail"
          onClick={() => {
            setCurrentRow(record);
            setShowDetail(true);
          }}
        >
          详情
        </a>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<AuditLog>
        headerTitle="审计日志"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 100,
        }}
        request={async (params) => {
          const { current = 1, pageSize = 20, ...filters } = params;
          const result = await getAuditLogs({
            current,
            pageSize,
            ...filters,
          });
          return {
            data: result,
            success: true,
          };
        }}
        columns={columns}
      />

      <Drawer
        width={600}
        open={showDetail}
        onClose={() => {
          setCurrentRow(undefined);
          setShowDetail(false);
        }}
        closable={false}
      >
        {currentRow && (
          <ProDescriptions<AuditLog>
            column={1}
            title="操作详情"
            dataSource={currentRow}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
              },
              {
                title: '用户',
                dataIndex: 'username',
              },
              {
                title: '用户ID',
                dataIndex: 'user_id',
              },
              {
                title: '操作类型',
                dataIndex: 'action',
                valueType: 'select',
                valueEnum: actionEnum,
                render: (_, entity) => {
                  const val = entity.action;
                  if (typeof val === 'object' && val !== null && 'text' in (val as any)) {
                    return (val as any).text;
                  }
                  return actionEnum[val as keyof typeof actionEnum]?.text || val;
                },
              },
              {
                title: '对象类型',
                dataIndex: 'target_type',
                valueType: 'select',
                valueEnum: targetTypeEnum,
                render: (_, entity) => {
                  const val = entity.target_type;
                  if (typeof val === 'object' && val !== null && 'text' in (val as any)) {
                    return (val as any).text;
                  }
                  return targetTypeEnum[val as keyof typeof targetTypeEnum]?.text || val;
                },
              },
              {
                title: '对象ID',
                dataIndex: 'target_id',
              },
              {
                title: 'IP地址',
                dataIndex: 'ip_address',
              },
              {
                title: '操作时间',
                dataIndex: 'created_at',
                valueType: 'dateTime',
              },
              {
                title: '变更详情',
                dataIndex: 'details',
                render: (_, entity) => {
                  if (!entity.details) return '-';
                  return (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                      {JSON.stringify(entity.details, null, 2)}
                    </pre>
                  );
                },
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AuditLogs;
