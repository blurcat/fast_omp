import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSwitch, ProFormSelect, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../../../services/users';
import { getRoles } from '../../../services/roles';
import type { User } from '../../../types';

const Users: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<User>();

  const handleAdd = async (fields: User & { password?: string }) => {
    const hide = message.loading('正在添加');
    try {
      await createUser(fields);
      hide();
      message.success('添加成功');
      setCreateModalOpen(false);
      actionRef.current?.reload();
      return true;
    } catch (error) {
      hide();
      message.error('添加失败请重试！');
      return false;
    }
  };

  const handleUpdate = async (fields: User & { password?: string }) => {
    const hide = message.loading('正在配置');
    try {
      if (currentRow?.id) {
        await updateUser(currentRow.id, fields);
        hide();
        message.success('配置成功');
        setUpdateModalOpen(false);
        setCurrentRow(undefined);
        actionRef.current?.reload();
        return true;
      }
    } catch (error) {
      hide();
      message.error('配置失败请重试！');
      return false;
    }
    return false;
  };

  const fetchRoleEnum = async () => {
    const roles = await getRoles() as unknown as any[];
    return roles.map((role: any) => ({
      label: role.name,
      value: role.id,
    }));
  };

  const columns: ProColumns<User>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      copyable: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      copyable: true,
    },
    {
      title: '角色',
      dataIndex: 'role_id',
      valueType: 'select',
      request: fetchRoleEnum,
      render: (_, record) => {
        // Since request is async, we might not have the label immediately if we rely purely on valueEnum generated from request in column definition
        // But ProTable handles request for valueEnum.
        // However, for the list display, if we want to show role Name, we rely on the backend User object having 'role' nested object, 
        // OR we trust the valueEnum map.
        // app/schemas/system.py UserResponse has `role: Optional[RoleResponse]`.
        // So we can use render to show role.name if available.
        return record.role?.name || '-'; 
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '超级管理员',
      dataIndex: 'is_superuser',
      search: false,
      render: (_, record) => (
        <Tag color={record.is_superuser ? 'gold' : 'blue'}>
          {record.is_superuser ? '是' : '否'}
        </Tag>
      ),
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
      key: 'option',
      render: (text, record, _, action) => [
        <a
          key="editable"
          onClick={() => {
            setCurrentRow(record);
            setUpdateModalOpen(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定要删除吗？"
          onConfirm={async () => {
            try {
              await deleteUser(record.id);
              message.success('删除成功');
              action?.reload();
            } catch (error) {
              message.error('删除失败');
            }
          }}
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<User>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params) => {
          const { current = 1, pageSize = 20 } = params;
          const skip = (current - 1) * pageSize;
          
          const result = await getUsers({
            skip,
            limit: pageSize,
          }) as unknown as any[];

          return {
            data: result,
            success: true,
            total: 100, // Mock total
          };
        }}
        columns={columns}
      />

      <ModalForm
        title="新建用户"
        width="500px"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as User);
          if (success) {
            setCreateModalOpen(false);
          }
        }}
      >
        <ProFormText
          rules={[
            {
              required: true,
              message: '用户名为必填项',
            },
          ]}
          label="用户名"
          name="username"
          placeholder="请输入用户名"
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '邮箱为必填项',
            },
            {
              type: 'email',
              message: '请输入有效的邮箱地址',
            },
          ]}
          label="邮箱"
          name="email"
          placeholder="请输入邮箱"
        />
        <ProFormSelect
          name="role_id"
          label="角色"
          request={fetchRoleEnum}
          placeholder="请选择角色"
        />
        <ProFormText.Password
          rules={[
            {
              required: true,
              message: '密码为必填项',
            },
            {
              min: 6,
              message: '密码至少6位',
            },
          ]}
          label="密码"
          name="password"
          placeholder="请输入密码"
        />
        <ProFormSwitch
          name="is_active"
          label="启用状态"
          initialValue={true}
        />
        <ProFormSwitch
          name="is_superuser"
          label="超级管理员"
          initialValue={false}
        />
      </ModalForm>

      <ModalForm
        title="编辑用户"
        width="500px"
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        initialValues={currentRow}
        onFinish={async (value) => {
          const success = await handleUpdate(value as User);
          if (success) {
            setUpdateModalOpen(false);
            setCurrentRow(undefined);
          }
        }}
        modalProps={{
          destroyOnHidden: true,
          afterClose: () => setCurrentRow(undefined),
        }}
      >
        <ProFormText
          rules={[
            {
              required: true,
              message: '用户名为必填项',
            },
          ]}
          label="用户名"
          name="username"
          placeholder="请输入用户名"
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '邮箱为必填项',
            },
            {
              type: 'email',
              message: '请输入有效的邮箱地址',
            },
          ]}
          label="邮箱"
          name="email"
          placeholder="请输入邮箱"
        />
        <ProFormText.Password
          label="密码"
          name="password"
          placeholder="如果不修改密码请留空"
          rules={[
            {
              min: 6,
              message: '密码至少6位',
            },
          ]}
        />
        <ProFormSwitch
          name="is_active"
          label="启用状态"
        />
        <ProFormSwitch
          name="is_superuser"
          label="超级管理员"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default Users;
