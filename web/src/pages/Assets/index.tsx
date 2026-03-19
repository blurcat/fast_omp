import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProDescriptions, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Drawer } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../../services/assets';
import { getAssetGroups } from '../../services/groups';
import type { Resource } from '../../types';

const Assets: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<Resource>();
  const [groups, setGroups] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    // Fetch groups for filter
    const fetchGroups = async () => {
      try {
        const res = await getAssetGroups();
        if (res) {
          setGroups(res.map((g: any) => ({ label: g.name, value: g.id })));
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchGroups();
  }, []);

  const handleAdd = async (fields: Resource) => {
    const hide = message.loading('正在添加');
    try {
      await createAsset(fields);
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

  const handleUpdate = async (fields: Resource) => {
    const hide = message.loading('正在配置');
    try {
      if (currentRow?.id) {
        await updateAsset(currentRow.id, fields);
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

  const columns: ProColumns<Resource>[] = [
    {
      title: '分组',
      dataIndex: 'group_id',
      render: (_, record: any) => (
        <>
          {record.groups?.map((group: any) => (
            <Tag key={group.id} color="blue">{group.name}</Tag>
          ))}
        </>
      ),
      valueType: 'select',
      fieldProps: {
        options: groups,
      },
    },
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
      hideInTable: true,
    },
    {
      title: '名称',
      dataIndex: 'name',
      copyable: true,
      ellipsis: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      copyable: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: {
        host: { text: '主机', status: 'Default' },
        database: { text: '数据库', status: 'Processing' },
        middleware: { text: '中间件', status: 'Warning' },
        network: { text: '网络设备', status: 'Success' },
      },
    },
    {
      title: '云厂商',
      dataIndex: 'provider',
      valueType: 'select',
      valueEnum: {
        aliyun: { text: '阿里云' },
        aws: { text: 'AWS' },
        tencent: { text: '腾讯云' },
        local: { text: '本地IDC' },
      },
    },
    {
      title: '区域',
      dataIndex: 'region',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '物理位置',
      dataIndex: 'location',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '业务线',
      dataIndex: 'business_unit',
    },
    {
      title: '负责人',
      dataIndex: 'owner',
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        running: { text: '运行中', status: 'Success' },
        stopped: { text: '已停止', status: 'Error' },
        unknown: { text: '未知', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 'running' ? 'green' : record.status === 'stopped' ? 'red' : 'default'}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      key: 'option',
      render: (_, record, _idx, action) => [
        <a
          key="detail"
          onClick={() => {
            setCurrentRow(record);
            setShowDetail(true);
          }}
        >
          详情
        </a>,
        <a
          key="editable"
          onClick={() => {
            const row = {
              ...record,
              group_ids: record.groups?.map((g: any) => g.id) || []
            };
            setCurrentRow(row);
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
              await deleteAsset(record.id);
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
      <ProTable<Resource>
        headerTitle="资产列表"
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
              setCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params) => {
          const { current = 1, pageSize = 20, ...filters } = params;
          const skip = (current - 1) * pageSize;
          
          const result = await getAssets({
            skip,
            limit: pageSize,
            ...filters,
          });

          return {
            data: result,
            success: true,
            total: result.length < pageSize ? result.length + skip : 1000, 
          };
        }}
        columns={columns}
      />
      
      <ModalForm
        title="新建资产"
        width="600px"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as Resource);
          if (success) {
            setCreateModalOpen(false);
          }
        }}
      >
        <ProFormText
          rules={[
            {
              required: true,
              message: '名称为必填项',
            },
          ]}
          label="资产名称"
          name="name"
          placeholder="请输入资产名称"
        />
        <ProFormSelect
          name="group_ids"
          label="所属分组"
          mode="multiple"
          options={groups}
          placeholder="请选择所属分组"
        />
        <ProFormSelect
          name="type"
          label="资产类型"
          valueEnum={{
            host: '主机',
            database: '数据库',
            middleware: '中间件',
            network: '网络设备',
          }}
          placeholder="请选择资产类型"
          rules={[{ required: true, message: '请选择资产类型' }]}
        />
        <ProFormSelect
          name="provider"
          label="云厂商"
          valueEnum={{
            aliyun: '阿里云',
            aws: 'AWS',
            tencent: '腾讯云',
            local: '本地IDC',
          }}
          placeholder="请选择云厂商"
          rules={[{ required: true, message: '请选择云厂商' }]}
        />
        <ProFormText
          name="region"
          label="区域/地域"
          placeholder="请输入区域"
        />
        <ProFormText
          name="location"
          label="物理位置"
          placeholder="请输入物理位置"
        />
        <ProFormText
          name="ip_address"
          label="IP地址"
          placeholder="请输入IP地址"
          rules={[
            {
              pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
              message: '请输入正确的IP地址',
            },
          ]}
        />
        <ProFormText
          name="business_unit"
          label="业务线"
          placeholder="请输入业务线"
        />
        <ProFormText
          name="owner"
          label="负责人"
          placeholder="请输入负责人"
        />
        <ProFormSelect
          name="status"
          label="状态"
          valueEnum={{
            running: '运行中',
            stopped: '已停止',
            unknown: '未知',
          }}
          placeholder="请选择状态"
          initialValue="unknown"
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
      </ModalForm>

      <ModalForm
        title="编辑资产"
        width="600px"
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        initialValues={currentRow}
        onFinish={async (value) => {
          const success = await handleUpdate(value as Resource);
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
              message: '名称为必填项',
            },
          ]}
          label="资产名称"
          name="name"
          placeholder="请输入资产名称"
        />
        <ProFormSelect
          name="group_ids"
          label="所属分组"
          mode="multiple"
          options={groups}
          placeholder="请选择所属分组"
        />
        <ProFormSelect
          name="type"
          label="资产类型"
          valueEnum={{
            host: '主机',
            database: '数据库',
            middleware: '中间件',
            network: '网络设备',
          }}
          placeholder="请选择资产类型"
          rules={[{ required: true, message: '请选择资产类型' }]}
        />
        <ProFormSelect
          name="provider"
          label="云厂商"
          valueEnum={{
            aliyun: '阿里云',
            aws: 'AWS',
            tencent: '腾讯云',
            local: '本地IDC',
          }}
          placeholder="请选择云厂商"
          rules={[{ required: true, message: '请选择云厂商' }]}
        />
        <ProFormText
          name="region"
          label="区域/地域"
          placeholder="请输入区域"
        />
        <ProFormText
          name="location"
          label="物理位置"
          placeholder="请输入物理位置"
        />
        <ProFormText
          name="ip_address"
          label="IP地址"
          placeholder="请输入IP地址"
          rules={[
            {
              pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
              message: '请输入正确的IP地址',
            },
          ]}
        />
        <ProFormText
          name="business_unit"
          label="业务线"
          placeholder="请输入业务线"
        />
        <ProFormText
          name="owner"
          label="负责人"
          placeholder="请输入负责人"
        />
        <ProFormSelect
          name="status"
          label="状态"
          valueEnum={{
            running: '运行中',
            stopped: '已停止',
            unknown: '未知',
          }}
          placeholder="请选择状态"
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
      </ModalForm>

      <Drawer
        width={600}
        open={showDetail}
        onClose={() => {
          setCurrentRow(undefined);
          setShowDetail(false);
        }}
        closable={false}
      >
        {currentRow?.name && (
          <ProDescriptions<Resource>
            column={2}
            title={currentRow?.name}
            request={async () => ({
              data: currentRow || {},
            })}
            params={{
              id: currentRow?.name,
            }}
            columns={[
              {
                title: 'ID',
                dataIndex: 'id',
              },
              {
                title: '名称',
                dataIndex: 'name',
              },
              {
                title: '分组',
                render: (_, record: any) => (
                  <>
                    {record.groups?.map((group: any) => (
                      <Tag key={group.id} color="blue">{group.name}</Tag>
                    ))}
                  </>
                ),
              },
              {
                title: '类型',
                dataIndex: 'type',
                valueEnum: {
                  host: { text: '主机', status: 'Default' },
                  database: { text: '数据库', status: 'Processing' },
                  middleware: { text: '中间件', status: 'Warning' },
                  network: { text: '网络设备', status: 'Success' },
                },
              },
              {
                title: '云厂商',
                dataIndex: 'provider',
                valueEnum: {
                  aliyun: { text: '阿里云' },
                  aws: { text: 'AWS' },
                  tencent: { text: '腾讯云' },
                  local: { text: '本地IDC' },
                },
              },
              {
                title: 'IP地址',
                dataIndex: 'ip_address',
              },
              {
                title: '区域',
                dataIndex: 'region',
              },
              {
                title: '物理位置',
                dataIndex: 'location',
              },
              {
                title: '业务线',
                dataIndex: 'business_unit',
              },
              {
                title: '负责人',
                dataIndex: 'owner',
              },
              {
                title: '状态',
                dataIndex: 'status',
                valueEnum: {
                  running: { text: '运行中', status: 'Success' },
                  stopped: { text: '已停止', status: 'Error' },
                  unknown: { text: '未知', status: 'Default' },
                },
              },
              {
                title: '创建时间',
                dataIndex: 'created_at',
                valueType: 'dateTime',
              },
              {
                title: '更新时间',
                dataIndex: 'updated_at',
                valueType: 'dateTime',
              },
              {
                title: '描述',
                dataIndex: 'description',
                span: 2,
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default Assets;
