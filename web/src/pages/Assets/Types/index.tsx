import React, { useRef, useState } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormTextArea, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, LockOutlined } from '@ant-design/icons';
import { getAssetTypes, createAssetType, updateAssetType, deleteAssetType, type AssetType } from '../../../services/assetTypes';

const AssetTypes: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState<AssetType>();

  const handleSubmit = async (values: any) => {
    try {
      if (currentRow) {
        await updateAssetType(currentRow.id, { name: values.name, description: values.description });
        message.success('更新成功');
      } else {
        await createAssetType(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      setCurrentRow(undefined);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAssetType(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '删除失败');
    }
  };

  const columns: ProColumns<AssetType>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '显示名称',
      dataIndex: 'name',
      render: (_, record) => (
        <>
          {record.name}
          {record.is_builtin && (
            <Tag color="gold" style={{ marginLeft: 8 }} icon={<LockOutlined />}>内置</Tag>
          )}
        </>
      ),
    },
    {
      title: '类型代码',
      dataIndex: 'value',
      copyable: true,
      search: false,
      render: (val) => <Tag color="blue">{val as string}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
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
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setCurrentRow(record);
            setModalVisible(true);
          }}
        >
          编辑
        </a>,
        !record.is_builtin && (
          <Popconfirm
            key="delete"
            title="确定删除该类型吗？已使用此类型的资产不受影响。"
            onConfirm={() => handleDelete(record.id)}
          >
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        ),
      ],
    },
  ];

  return (
    <PageContainer>
      <ProTable<AssetType>
        headerTitle="资产类型管理"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setCurrentRow(undefined);
              setModalVisible(true);
            }}
          >
            <PlusOutlined /> 新建类型
          </Button>,
        ]}
        request={async (params) => {
          const result = await getAssetTypes({ name: params.name });
          return { data: result, success: true, total: result.length };
        }}
        columns={columns}
      />

      <ModalForm
        title={currentRow ? '编辑资产类型' : '新建资产类型'}
        width="460px"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        initialValues={currentRow}
        modalProps={{ destroyOnClose: true, afterClose: () => setCurrentRow(undefined) }}
      >
        <ProFormText
          name="name"
          label="显示名称"
          placeholder="如：主机、K8s Pod、RDS 实例"
          rules={[{ required: true, message: '请输入显示名称' }]}
        />
        {!currentRow && (
          <ProFormText
            name="value"
            label="类型代码"
            placeholder="如：host、k8s_pod（英文/下划线，唯一）"
            rules={[
              { required: true, message: '请输入类型代码' },
              { pattern: /^[a-z0-9_]+$/, message: '只允许小写字母、数字和下划线' },
            ]}
            extra="类型代码一旦创建不可修改，将作为资产的 type 字段值存储"
          />
        )}
        {currentRow && (
          <ProFormText
            name="value"
            label="类型代码"
            disabled
            extra="类型代码不可修改"
          />
        )}
        <ProFormTextArea name="description" label="描述" placeholder="请输入类型说明（可选）" />
      </ModalForm>
    </PageContainer>
  );
};

export default AssetTypes;
