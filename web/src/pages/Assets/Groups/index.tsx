import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Drawer, List, Tag, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAssetGroups, getAssetGroup, createAssetGroup, updateAssetGroup, deleteAssetGroup, batchAddAssetsToGroup, removeAssetFromGroup, type AssetGroup } from '../../../services/groups';
import { getAssets } from '../../../services/assets';
import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import type { Resource } from '../../../types';

const AssetGroups: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<AssetGroup>();
  const [detailVisible, setDetailVisible] = useState(false);

  const [groupMembers, setGroupMembers] = useState<Resource[]>([]);
  const [allAssets, setAllAssets] = useState<Resource[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);

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
      const res = await getAssets({ limit: 500 });
      setAllAssets(res?.items || []);
    } catch (error) {
      message.error('获取资产列表失败');
    }
  };

  const handleBatchAddMembers = async () => {
    if (!currentRow || !selectedAssetIds.length) return;
    try {
      const res = await batchAddAssetsToGroup(currentRow.id, selectedAssetIds);
      message.success(res.message);
      fetchGroupDetails(currentRow.id);
      setSelectedAssetIds([]);
      actionRef.current?.reload();
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
      actionRef.current?.reload();
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

  // Assets not yet in this group
  const availableAssets = allAssets.filter(
    a => !groupMembers.some(m => m.id === a.id)
  );

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
      ellipsis: true,
    },
    {
      title: '资产数量',
      dataIndex: 'resource_count',
      search: false,
      width: 90,
      render: (val) => <Tag color="blue">{val as number}</Tag>,
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
          title="确定删除吗？删除分组不会删除分组内资产。"
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
        search={{ labelWidth: 120 }}
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
          const { current = 1, pageSize = 20, name, ...rest } = params;
          const skip = (current - 1) * pageSize;
          const result = await getAssetGroups({ skip, limit: pageSize, name, ...rest });
          return {
            data: result,
            success: true,
            total: result.length,
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
        modalProps={{ destroyOnClose: true }}
      >
        <ProFormText
          name="name"
          label="分组名称"
          rules={[{ required: true, message: '请输入分组名称' }]}
        />
        <ProFormTextArea name="description" label="描述" />
      </ModalForm>

      <Drawer
        width={640}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setCurrentRow(undefined);
          setGroupMembers([]);
          setSelectedAssetIds([]);
        }}
        closable
        title={currentRow ? `${currentRow.name} — 资产成员管理` : '资产成员管理'}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>批量添加资产</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              mode="multiple"
              showSearch
              style={{ flex: 1 }}
              placeholder="选择一个或多个资产"
              optionFilterProp="label"
              onChange={(values) => setSelectedAssetIds(values as number[])}
              value={selectedAssetIds}
              options={availableAssets.map(asset => ({
                label: `${asset.name}${asset.ip_address ? ` (${asset.ip_address})` : ''}`,
                value: asset.id,
              }))}
            />
            <Button
              type="primary"
              onClick={handleBatchAddMembers}
              disabled={!selectedAssetIds.length}
            >
              <PlusOutlined /> 添加
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: 8, color: '#666' }}>
          当前成员（{groupMembers.length} 个资产）
        </div>
        <List
          itemLayout="horizontal"
          dataSource={groupMembers}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveMember(item.id)}
                >
                  移除
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <>
                    <Tag>{item.type}</Tag>
                    {item.ip_address && <span>{item.ip_address}</span>}
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
