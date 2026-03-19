import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Select, Radio, Form, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getPermissions, grantPermission, revokePermission, type ResourcePermission } from '../../../services/permissions';
import { getUsers } from '../../../services/users';
import { getAssets } from '../../../services/assets';
import { getAssetGroups } from '../../../services/groups';
import type { User, Resource } from '../../../types';
import type { AssetGroup } from '../../../services/groups';

const Permissions: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // Data sources for select
  const [users, setUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  
  // Modal state
  const [targetType, setTargetType] = useState<'resource' | 'group'>('resource');

  useEffect(() => {
    if (createModalVisible) {
      fetchOptions();
    }
  }, [createModalVisible]);

  const fetchOptions = async () => {
    const [uRes, rRes, gRes] = await Promise.all([
      getUsers(),
      getAssets(),
      getAssetGroups()
    ]);
    setUsers(uRes || []);
    setResources(rRes || []);
    setGroups(gRes || []);
  };

  const handleGrant = async () => {
    try {
      const values = await form.validateFields();
      await grantPermission({
        user_id: values.user_id,
        permission: values.permission,
        resource_id: targetType === 'resource' ? values.target_id : undefined,
        group_id: targetType === 'group' ? values.target_id : undefined,
      });
      message.success('授权成功');
      setCreateModalVisible(false);
      form.resetFields();
      actionRef.current?.reload();
    } catch (error) {
      message.error('授权失败');
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await revokePermission(id);
      message.success('撤销成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('撤销失败');
    }
  };

  const columns: ProColumns<ResourcePermission>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
    },
    {
      title: '授权对象',
      render: (_, record) => {
        if (record.resource_id) {
          return `资产ID: ${record.resource_id}`;
        }
        if (record.group_id) {
          return `分组ID: ${record.group_id}`;
        }
        return '-';
      }
    },
    {
      title: '权限类型',
      dataIndex: 'permission',
      valueEnum: {
        read: { text: '只读', status: 'Default' },
        write: { text: '读写', status: 'Success' },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <Popconfirm
          key="revoke"
          title="确定撤销吗？"
          onConfirm={() => handleRevoke(record.id)}
        >
          <a style={{ color: 'red' }}>撤销</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<ResourcePermission>
        headerTitle="权限管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCreateModalVisible(true);
            }}
          >
            <PlusOutlined /> 新增授权
          </Button>,
        ]}
        request={async (params) => {
            const { current = 1, pageSize = 20 } = params;
            const result = await getPermissions({
                skip: (current - 1) * pageSize,
                limit: pageSize
            });
            return {
                data: result,
                success: true,
            };
        }}
        columns={columns}
      />

      <Modal
        title="新增授权"
        open={createModalVisible}
        onOk={handleGrant}
        onCancel={() => setCreateModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ permission: 'read', target_type: 'resource' }}>
            <Form.Item name="user_id" label="用户" rules={[{ required: true }]}>
                <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="选择用户"
                    options={users.map(u => ({ label: u.username, value: u.id }))}
                />
            </Form.Item>
            
            <Form.Item label="授权对象类型" name="target_type">
                <Radio.Group onChange={(e) => setTargetType(e.target.value)}>
                    <Radio value="resource">单个资产</Radio>
                    <Radio value="group">资产分组</Radio>
                </Radio.Group>
            </Form.Item>
            
            <Form.Item name="target_id" label={targetType === 'resource' ? "选择资产" : "选择分组"} rules={[{ required: true }]}>
                <Select
                    showSearch
                    optionFilterProp="children"
                    placeholder="请选择"
                    options={
                        targetType === 'resource' 
                        ? resources.map(r => ({ label: `${r.name} (${r.ip_address})`, value: r.id }))
                        : groups.map(g => ({ label: g.name, value: g.id }))
                    }
                />
            </Form.Item>
            
            <Form.Item name="permission" label="权限级别" rules={[{ required: true }]}>
                <Radio.Group>
                    <Radio value="read">只读</Radio>
                    <Radio value="write">读写</Radio>
                </Radio.Group>
            </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Permissions;
