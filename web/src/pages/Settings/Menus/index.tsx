import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormDigit, ProFormTreeSelect, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getMenus, createMenu, updateMenu, deleteMenu, type Menu } from '../../../services/menus';

// 递归处理菜单数据以适配 TreeSelect
const formatMenuTree = (menus: Menu[]): any[] => {
  return menus.map((item) => ({
    title: item.title,
    value: item.id,
    children: item.children ? formatMenuTree(item.children) : undefined,
  }));
};

const Menus: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<Menu>();
  const [menuTreeData, setMenuTreeData] = useState<any[]>([]);

  // 加载菜单树数据用于 Select
  const fetchMenuTree = async () => {
    try {
      const data = await getMenus();
      setMenuTreeData(formatMenuTree(data));
    } catch (error) {
      console.error('Failed to fetch menu tree:', error);
    }
  };

  const handleAdd = async (fields: Menu) => {
    const hide = message.loading('正在添加');
    try {
      await createMenu(fields);
      hide();
      message.success('添加成功');
      setCreateModalOpen(false);
      actionRef.current?.reload();
      fetchMenuTree(); // 刷新树数据
      return true;
    } catch (error) {
      hide();
      message.error('添加失败请重试！');
      return false;
    }
  };

  const handleUpdate = async (fields: Menu) => {
    const hide = message.loading('正在配置');
    try {
      if (currentRow?.id) {
        await updateMenu(currentRow.id, fields);
        hide();
        message.success('配置成功');
        setUpdateModalOpen(false);
        setCurrentRow(undefined);
        actionRef.current?.reload();
        fetchMenuTree(); // 刷新树数据
        return true;
      }
    } catch (error) {
      hide();
      message.error('配置失败请重试！');
      return false;
    }
    return false;
  };

  const columns: ProColumns<Menu>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '菜单标题',
      dataIndex: 'title',
      copyable: true,
      ellipsis: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
    },
    {
      title: '图标',
      dataIndex: 'icon',
      search: false,
      render: (_, record) => record.icon ? <Tag>{record.icon}</Tag> : '-',
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      copyable: true,
    },
    {
      title: '排序',
      dataIndex: 'order',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      render: (_, record, _idx, action) => [
        <a
          key="editable"
          onClick={() => {
            setCurrentRow(record);
            // 编辑时重新加载树数据，确保父级选择正确
            fetchMenuTree();
            setUpdateModalOpen(true);
          }}
        >
          编辑
        </a>,
        <Popconfirm
          key="delete"
          title="确定要删除吗？"
          description="如果有子菜单，请先删除子菜单。"
          onConfirm={async () => {
            try {
              await deleteMenu(record.id);
              message.success('删除成功');
              action?.reload();
              fetchMenuTree();
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
      <ProTable<Menu>
        headerTitle="菜单列表"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              fetchMenuTree();
              setCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (_params) => {
          const result = await getMenus();
          // ProTable 自动处理 children 字段进行树形展示
          return {
            data: result,
            success: true,
          };
        }}
        columns={columns}
      />
      
      <ModalForm
        title="新建菜单"
        width="500px"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as Menu);
          if (success) {
            setCreateModalOpen(false);
          }
        }}
      >
        <ProFormTreeSelect
          name="parent_id"
          label="父级菜单"
          placeholder="请选择父级菜单（留空为顶级菜单）"
          fieldProps={{
            treeData: menuTreeData,
            allowClear: true,
          }}
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '标题为必填项',
            },
          ]}
          label="菜单标题"
          name="title"
          placeholder="请输入菜单标题"
        />
        <ProFormText
          name="icon"
          label="图标"
          placeholder="请输入图标代码 (如 UserOutlined)"
        />
        <ProFormText
          name="path"
          label="路由路径"
          placeholder="请输入路由路径 (如 /settings/menus)"
        />
        <ProFormDigit
          name="order"
          label="排序"
          placeholder="请输入排序权重"
          initialValue={0}
        />
      </ModalForm>

      <ModalForm
        title="编辑菜单"
        width="500px"
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        initialValues={currentRow}
        onFinish={async (value) => {
          const success = await handleUpdate(value as Menu);
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
         <ProFormTreeSelect
          name="parent_id"
          label="父级菜单"
          placeholder="请选择父级菜单（留空为顶级菜单）"
          fieldProps={{
            treeData: menuTreeData,
            allowClear: true,
            // 避免选择自己作为父级（简单处理）
            treeDefaultExpandAll: true,
          }}
        />
        <ProFormText
          rules={[
            {
              required: true,
              message: '标题为必填项',
            },
          ]}
          label="菜单标题"
          name="title"
          placeholder="请输入菜单标题"
        />
        <ProFormText
          name="icon"
          label="图标"
          placeholder="请输入图标代码"
        />
        <ProFormText
          name="path"
          label="路由路径"
          placeholder="请输入路由路径"
        />
        <ProFormDigit
          name="order"
          label="排序"
          placeholder="请输入排序权重"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default Menus;
