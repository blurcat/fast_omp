import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Drawer, List, Tag, Select, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAssetGroups, getAssetGroup, createAssetGroup, updateAssetGroup, deleteAssetGroup, addAssetToGroup, removeAssetFromGroup, type AssetGroup } from '../../../services/groups';
import { getAssets } from '../../../services/assets';
import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import type { Resource } from '../../../types';

const AssetGroups: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<AssetGroup>();
  const [detailVisible, setDetailVisible] = useState(false);
  
  // Group members state
  const [groupMembers, setGroupMembers] = useState<Resource[]>([]);
  const [allAssets, setAllAssets] = useState<Resource[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number>();

  useEffect(() => {
    if (detailVisible && currentRow) {
      fetchGroupDetails(currentRow.id);
      fetchAllAssets();
    }
  }, [detailVisible, currentRow]);

  const fetchGroupDetails = async (id: number) => {
      try {
          const group = await getAssetGroup(id);
          setGroupMembers(group.resources || []);
      } catch (error) {
          console.error('Failed to fetch group details', error);
      }
  };
  
  const fetchAllAssets = async () => {
      try {
          const res = await getAssets();
          setAllAssets(res || []);
      } catch (error) {
          message.error('获取资产列表失败');
      }
  };

  const handleAddMember = async () => {
      if (!currentRow || !selectedAssetId) return;
      try {
          await addAssetToGroup(currentRow.id, selectedAssetId);
          message.success('添加成功');
          fetchGroupDetails(currentRow.id);
          setSelectedAssetId(undefined);
      } catch (error) {
          message.error('添加失败');
      }
  };

  const handleRemoveMember = async (resourceId: number) => {
      if (!currentRow) return;
      try {
          await removeAssetFromGroup(currentRow.id, resourceId);
          message.success('移除成功');
          fetchGroupDetails(currentRow.id);
      } catch (error) {
          message.error('移除失败');
      }
  };

  const handleCreate = async (values: any) => {
    try {
      if (currentRow) {
        await updateAssetGroup(currentRow.id, values);
        message.success('更新成功');
      } else {
        await createAssetGroup(values);
        message.success('创建成功');
      }
      setCreateModalVisible(false);
      setCurrentRow(undefined);
      actionRef.current?.reload();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAssetGroup(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns: ProColumns<AssetGroup>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '分组名称',
      dataIndex: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
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
        <a
          key="edit"
          onClick={() => {
            setCurrentRow(record);
            setCreateModalVisible(true);
          }}
        >
          编辑
        </a>,
        <a
          key="detail"
          onClick={() => {
            setCurrentRow(record);
            setDetailVisible(true);
          }}
        >
          资产成员
        </a>,
        <Popconfirm
          key="delete"
          title="确定删除吗？"
          onConfirm={() => handleDelete(record.id)}
        >
          <a style={{ color: 'red' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<AssetGroup>
        headerTitle="资产分组"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCurrentRow(undefined);
              setCreateModalVisible(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params) => {
            // Need to adjust if API supports pagination in params, currently it returns all list
            const result = await getAssetGroups(params);
            return {
                data: result,
                success: true,
            };
        }}
        columns={columns}
      />

      <ModalForm
        title={currentRow ? '编辑分组' : '新建分组'}
        width="400px"
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        onFinish={handleCreate}
        initialValues={currentRow}
        modalProps={{
            destroyOnClose: true
        }}
      >
        <ProFormText
          name="name"
          label="分组名称"
          rules={[{ required: true, message: '请输入分组名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
        />
      </ModalForm>

      <Drawer
        width={600}
        open={detailVisible}
        onClose={() => {
            setDetailVisible(false);
            setCurrentRow(undefined);
            setGroupMembers([]);
        }}
        closable={true}
        title={currentRow ? `${currentRow.name} - 资产成员管理` : '资产成员管理'}
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Select
                showSearch
                style={{ flex: 1 }}
                placeholder="选择资产添加至分组"
                optionFilterProp="children"
                onChange={(value) => setSelectedAssetId(value)}
                value={selectedAssetId}
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={allAssets.map(asset => ({
                    label: `${asset.name} (${asset.ip_address || 'No IP'})`,
                    value: asset.id
                }))}
            />
            <Button type="primary" onClick={handleAddMember} disabled={!selectedAssetId}>
                <PlusOutlined /> 添加
            </Button>
        </div>
        
        <List
            itemLayout="horizontal"
            dataSource={groupMembers}
            renderItem={(item) => (
                <List.Item
                    actions={[
                        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveMember(item.id)}>移除</Button>
                    ]}
                >
                    <List.Item.Meta
                        title={item.name}
                        description={
                            <>
                                <Tag>{item.type}</Tag>
                                {item.ip_address}
                            </>
                        }
                    />
                </List.Item>
            )}
        />
      </Drawer>
    </PageContainer>
  );
};

export default AssetGroups;
