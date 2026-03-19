import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Modal, Tree } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { getRoles, createRole, updateRole, deleteRole } from '../../../services/roles';
import { getMenus } from '../../../services/menus';

const Roles: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState<boolean>(false);
  
  const [currentRow, setCurrentRow] = useState<any>();
  const [menuData, setMenuData] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);

  // 递归格式化菜单数据为 Tree 组件需要的格式
  const formatMenuTree = (menus: any[]): any[] => {
    return menus.map((item) => ({
      title: item.title,
      key: item.id,
      children: item.children ? formatMenuTree(item.children) : undefined,
    }));
  };

  const handleAdd = async (fields: any) => {
    const hide = message.loading('正在添加');
    try {
      await createRole(fields);
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

  const handleUpdate = async (fields: any) => {
    const hide = message.loading('正在配置');
    try {
      if (currentRow?.id) {
        await updateRole(currentRow.id, fields);
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

  const handlePermissionClick = async (record: any) => {
    setCurrentRow(record);
    try {
      // 1. 获取所有菜单
      const menus = await getMenus();
      setMenuData(formatMenuTree(menus));
      
      // 2. 设置当前选中的菜单
      // 假设 permissions 字段结构为 { menu_ids: [1, 2, 3] }
      const currentMenuIds = record.permissions?.menu_ids || [];
      setCheckedKeys(currentMenuIds);
      
      setPermissionModalOpen(true);
    } catch (error) {
      message.error('获取权限数据失败');
    }
  };

  const handleSavePermission = async () => {
    if (!currentRow?.id) return;
    const hide = message.loading('正在保存权限');
    try {
      // 保存选中的菜单ID到 permissions 字段
      await updateRole(currentRow.id, {
        permissions: {
          menu_ids: checkedKeys,
        },
      });
      hide();
      message.success('权限保存成功');
      setPermissionModalOpen(false);
      actionRef.current?.reload();
    } catch (error) {
      hide();
      message.error('保存失败请重试！');
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      copyable: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
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
      render: (_, record, _idx, action) => [
        <a
          key="permission"
          onClick={() => handlePermissionClick(record)}
        >
          <SettingOutlined /> 分配权限
        </a>,
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
              await deleteRole(record.id);
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
      <ProTable<any>
        headerTitle="角色列表"
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
          const result = await getRoles(params) as unknown as any[];
          return {
            data: result,
            success: true,
          };
        }}
        columns={columns}
      />

      <ModalForm
        title="新建角色"
        width="500px"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value);
          if (success) {
            setCreateModalOpen(false);
          }
        }}
      >
        <ProFormText
          rules={[
            {
              required: true,
              message: '角色名称为必填项',
            },
          ]}
          label="角色名称"
          name="name"
          placeholder="请输入角色名称"
        />
        <ProFormTextArea
          label="描述"
          name="description"
          placeholder="请输入描述"
        />
      </ModalForm>

      <ModalForm
        title="编辑角色"
        width="500px"
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        initialValues={currentRow}
        onFinish={async (value) => {
          const success = await handleUpdate(value);
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
              message: '角色名称为必填项',
            },
          ]}
          label="角色名称"
          name="name"
          placeholder="请输入角色名称"
        />
        <ProFormTextArea
          label="描述"
          name="description"
          placeholder="请输入描述"
        />
      </ModalForm>

      <Modal
        title={`分配权限 - ${currentRow?.name}`}
        open={permissionModalOpen}
        onOk={handleSavePermission}
        onCancel={() => setPermissionModalOpen(false)}
        destroyOnClose
      >
        <Tree
          checkable
          treeData={menuData}
          checkedKeys={checkedKeys}
          onCheck={(keys) => {
            // keys 可能是 { checked: [], halfChecked: [] } 或 []
            // Antd Tree 的 checkedKeys 类型定义比较复杂
            if (Array.isArray(keys)) {
              setCheckedKeys(keys);
            } else {
              setCheckedKeys((keys as any).checked);
            }
          }}
          defaultExpandAll
          height={400}
        />
      </Modal>
    </PageContainer>
  );
};

export default Roles;
