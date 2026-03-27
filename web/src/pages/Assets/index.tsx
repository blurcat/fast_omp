import React, { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProDescriptions, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag, Drawer, Input, Divider, Space, Modal, Alert, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getAssets, createAsset, updateAsset, deleteAsset, batchDeleteAssets, testAssetConnection } from '../../services/assets';
import { getAssetGroups } from '../../services/groups';
import { getAssetTypes, createAssetType } from '../../services/assetTypes';
import { getCredentials } from '../../services/credentials';
import type { Resource } from '../../types';

const DEFAULT_PROVIDER_OPTIONS = [
  { label: '阿里云', value: 'aliyun' },
  { label: 'AWS', value: 'aws' },
  { label: '腾讯云', value: 'tencent' },
  { label: '本地IDC', value: 'local' },
];

const Assets: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<Resource>();
  const [groups, setGroups] = useState<{ label: string; value: number }[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [typeOptions, setTypeOptions] = useState<{ label: string; value: string }[]>([]);
  const [providerOptions, setProviderOptions] = useState(DEFAULT_PROVIDER_OPTIONS);
  const [credentialOptions, setCredentialOptions] = useState<{ label: React.ReactNode; value: number }[]>([]);
  const [credentialMap, setCredentialMap] = useState<Record<number, { name: string; type: string }>>({});

  // test-connection modal state
  const [testTarget, setTestTarget] = useState<Resource>();
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testPort, setTestPort] = useState<number | undefined>();
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [customProviderInput, setCustomProviderInput] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await getAssetGroups();
        if (res) setGroups(res.map((g: any) => ({ label: g.name, value: g.id })));
      } catch (error) {
        console.error(error);
      }
    };
    const fetchTypes = async () => {
      try {
        const res = await getAssetTypes();
        if (res) setTypeOptions(res.map(t => ({ label: t.name, value: t.value })));
      } catch (error) {
        console.error(error);
      }
    };
    const fetchCredentials = async () => {
      try {
        const res: any[] = await getCredentials({ limit: 500 });
        if (res) {
          const typeLabel: Record<string, string> = {
            ssh_password: 'SSH密码', ssh_key: 'SSH密钥', api_token: 'API Token', database: '数据库',
          };
          const enabled = res.filter(c => c.enabled);
          setCredentialOptions(enabled.map(c => ({
            label: (
              <span>
                {c.name}
                <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{typeLabel[c.type] || c.type}</Tag>
              </span>
            ),
            value: c.id,
          })));
          const map: Record<number, { name: string; type: string }> = {};
          enabled.forEach(c => { map[c.id] = { name: c.name, type: c.type }; });
          setCredentialMap(map);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchGroups();
    fetchTypes();
    fetchCredentials();
  }, []);

  const ensureOptionExists = (
    value: string | undefined,
    options: { label: string; value: string }[],
    setOptions: React.Dispatch<React.SetStateAction<{ label: string; value: string }[]>>
  ) => {
    if (value && !options.find(o => o.value === value)) {
      setOptions(prev => [...prev, { label: value, value }]);
    }
  };

  const openEditModal = (record: Resource) => {
    ensureOptionExists(record.type, typeOptions, setTypeOptions);
    ensureOptionExists(record.provider, providerOptions, setProviderOptions);
    setCurrentRow({ ...record, group_ids: record.groups?.map((g: any) => g.id) || [] } as any);
    setUpdateModalOpen(true);
  };

  const runTest = async (record: Resource, port?: number) => {
    setTestResult(null);
    setTestLoading(true);
    try {
      const res = await testAssetConnection(record.id, port);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, error: e?.response?.data?.detail || '请求失败' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestConnection = (record: Resource) => {
    setTestTarget(record);
    setTestResult(null);
    setTestPort(undefined);
    // 绑定了凭证则自动执行，否则让用户确认端口后手动点
    if (record.credential_id) {
      setTimeout(() => runTest(record, undefined), 0);
    }
  };

  const addCustomType = async () => {
    const val = customTypeInput.trim();
    if (!val) return;
    if (typeOptions.find(o => o.value === val)) {
      setCustomTypeInput('');
      return;
    }
    // Optimistically add to local state
    setTypeOptions(prev => [...prev, { label: val, value: val }]);
    setCustomTypeInput('');
    // Persist to backend (value = label for custom entries)
    try {
      await createAssetType({ name: val, value: val });
    } catch {
      // Ignore duplicate errors (already exists in DB)
    }
  };

  const addCustomProvider = () => {
    const val = customProviderInput.trim();
    if (val && !providerOptions.find(o => o.value === val)) {
      setProviderOptions(prev => [...prev, { label: val, value: val }]);
    }
    setCustomProviderInput('');
  };

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

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    const hide = message.loading('正在批量删除');
    try {
      await batchDeleteAssets(selectedRowKeys as number[]);
      hide();
      message.success(`成功删除 ${selectedRowKeys.length} 条资产`);
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (error) {
      hide();
      message.error('批量删除失败');
    }
  };

  const statusValueEnum = {
    running: { text: '运行中', status: 'Success' },
    stopped: { text: '已停止', status: 'Error' },
    maintenance: { text: '维护中', status: 'Warning' },
    unknown: { text: '未知', status: 'Default' },
  };

  const getLabelByValue = (options: { label: string; value: string }[], value: string) => {
    return options.find(o => o.value === value)?.label ?? value;
  };

  const typeDropdownRender = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Space style={{ padding: '0 8px 8px' }}>
        <Input
          placeholder="自定义类型"
          value={customTypeInput}
          onChange={e => setCustomTypeInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomType()}
          style={{ width: 150 }}
        />
        <Button type="text" icon={<PlusOutlined />} onClick={addCustomType}>
          添加
        </Button>
      </Space>
    </>
  );

  const providerDropdownRender = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <Space style={{ padding: '0 8px 8px' }}>
        <Input
          placeholder="自定义来源"
          value={customProviderInput}
          onChange={e => setCustomProviderInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomProvider()}
          style={{ width: 150 }}
        />
        <Button type="text" icon={<PlusOutlined />} onClick={addCustomProvider}>
          添加
        </Button>
      </Space>
    </>
  );

  const columns: ProColumns<Resource>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
      hideInTable: true,
    },
    {
      title: '资产名称',
      dataIndex: 'name',
      copyable: true,
      ellipsis: true,
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
      fieldProps: { options: typeOptions },
      render: (_, record) => getLabelByValue(typeOptions, record.type),
    },
    {
      title: '云厂商/来源',
      dataIndex: 'provider',
      valueType: 'select',
      fieldProps: { options: providerOptions },
      hideInTable: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
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
      title: '登录凭证',
      dataIndex: 'credential_id',
      search: false,
      render: (val: any) => {
        if (!val) return <span style={{ color: '#bbb' }}>—</span>;
        const cred = credentialMap[val as number];
        return cred
          ? <Tag icon={<ApiOutlined />} color="purple">{cred.name}</Tag>
          : <Tag color="purple">#{val}</Tag>;
      },
    },
    {
      title: '所属分组',
      dataIndex: 'group_id',
      search: true,
      valueType: 'select',
      fieldProps: { options: groups },
      render: (_, record: any) => (
        <>
          {record.groups?.map((group: any) => (
            <Tag key={group.id} color="blue">{group.name}</Tag>
          ))}
        </>
      ),
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
        <a key="editable" onClick={() => openEditModal(record)}>
          编辑
        </a>,
        <a key="test" onClick={() => handleTestConnection(record)}>
          测试连接
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

  const typeFormItem = (
    <ProFormSelect
      name="type"
      label="资产类型"
      options={typeOptions}
      placeholder="请选择或输入资产类型"
      rules={[{ required: true, message: '请选择资产类型' }]}
      fieldProps={{ dropdownRender: typeDropdownRender }}
    />
  );

  const providerFormItem = (
    <ProFormSelect
      name="provider"
      label="云厂商/来源"
      options={providerOptions}
      placeholder="请选择或输入云厂商"
      rules={[{ required: true, message: '请选择云厂商' }]}
      fieldProps={{ dropdownRender: providerDropdownRender }}
    />
  );

  const formFields = (
    <>
      <ProFormText
        rules={[{ required: true, message: '名称为必填项' }]}
        label="资产名称"
        name="name"
        placeholder="请输入资产名称"
      />
      {typeFormItem}
      {providerFormItem}
      <ProFormText
        name="ip_address"
        label="IP地址"
        placeholder="请输入IP地址"
        rules={[
          { required: true, message: 'IP地址为必填项' },
          {
            pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            message: '请输入正确的IPv4地址',
          },
        ]}
      />
      <ProFormSelect
        name="status"
        label="状态"
        valueEnum={{
          running: '运行中',
          stopped: '已停止',
          maintenance: '维护中',
          unknown: '未知',
        }}
        placeholder="请选择状态"
        initialValue="unknown"
      />
      <ProFormText name="region" label="区域/地域" placeholder="请输入区域" />
      <ProFormText name="location" label="物理位置" placeholder="请输入物理位置" />
      <ProFormText name="business_unit" label="业务线" placeholder="请输入业务线" />
      <ProFormText name="owner" label="负责人" placeholder="请输入负责人" />
      <ProFormSelect
        name="credential_id"
        label="登录凭证"
        options={credentialOptions}
        placeholder="选择用于 SSH/数据库登录的凭证（可选）"
        allowClear
        extra="选择后可在资产列表一键测试连接"
      />
      <ProFormSelect
        name="group_ids"
        label="所属分组"
        mode="multiple"
        options={groups}
        placeholder="请选择所属分组"
      />
      <ProFormTextArea name="description" label="描述" placeholder="请输入描述" />
    </>
  );

  return (
    <PageContainer>
      <ProTable<Resource>
        headerTitle="资产列表"
        actionRef={actionRef}
        rowKey="id"
        search={{ labelWidth: 120 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Popconfirm
              key="batchDelete"
              title={`确定删除选中的 ${selectedRowKeys.length} 条资产吗？`}
              onConfirm={handleBatchDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          ),
          <Button
            type="primary"
            key="primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={async (params) => {
          const { current = 1, pageSize = 20, ...filters } = params;
          const skip = (current - 1) * pageSize;
          const result = await getAssets({ skip, limit: pageSize, ...filters });
          return {
            data: result.items,
            success: true,
            total: result.total,
          };
        }}
        columns={columns}
        pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
      />

      <ModalForm
        title="新建资产"
        width="600px"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onFinish={async (value) => {
          const success = await handleAdd(value as Resource);
          if (success) setCreateModalOpen(false);
        }}
        modalProps={{ destroyOnHidden: true }}
      >
        {formFields}
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
        modalProps={{ destroyOnHidden: true, afterClose: () => setCurrentRow(undefined) }}
      >
        {formFields}
      </ModalForm>

      <Drawer
        width={600}
        open={showDetail}
        onClose={() => {
          setCurrentRow(undefined);
          setShowDetail(false);
        }}
        closable
        extra={
          currentRow && (
            <Button
              icon={<ApiOutlined />}
              onClick={() => {
                setShowDetail(false);
                handleTestConnection(currentRow);
              }}
            >
              测试连接
            </Button>
          )
        }
      >
        {currentRow?.name && (
          <ProDescriptions<Resource>
            column={2}
            title={currentRow?.name}
            request={async () => ({ data: currentRow || {} })}
            params={{ id: currentRow?.name }}
            columns={[
              { title: 'ID', dataIndex: 'id' },
              { title: '资产名称', dataIndex: 'name' },
              {
                title: '所属分组',
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
                render: (_, record) => getLabelByValue(typeOptions, record.type),
              },
              {
                title: '云厂商/来源',
                dataIndex: 'provider',
                render: (_, record) => getLabelByValue(providerOptions, record.provider),
              },
              { title: 'IP地址', dataIndex: 'ip_address' },
              { title: '区域', dataIndex: 'region' },
              { title: '物理位置', dataIndex: 'location' },
              { title: '业务线', dataIndex: 'business_unit' },
              { title: '负责人', dataIndex: 'owner' },
              {
                title: '状态',
                dataIndex: 'status',
                valueEnum: statusValueEnum,
              },
              {
                title: '登录凭证',
                dataIndex: 'credential_id',
                render: (val: any) => {
                  if (!val) return '—';
                  const cred = credentialMap[val as number];
                  return cred ? (
                    <Tag icon={<ApiOutlined />} color="purple">{cred.name}</Tag>
                  ) : `#${val}`;
                },
              },
              { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime' },
              { title: '更新时间', dataIndex: 'updated_at', valueType: 'dateTime' },
              { title: '描述', dataIndex: 'description', span: 2 },
            ]}
          />
        )}
      </Drawer>
      {/* 测试连接结果弹窗 */}
      <Modal
        title={
          <span>
            <ApiOutlined style={{ marginRight: 8 }} />
            测试连接 — {testTarget?.name}
          </span>
        }
        open={!!testTarget}
        onCancel={() => { setTestTarget(undefined); setTestResult(null); setTestPort(undefined); }}
        footer={[
          <Button
            key="retest"
            type="primary"
            onClick={() => testTarget && runTest(testTarget, testPort)}
            loading={testLoading}
          >
            {testResult ? '重新测试' : '开始测试'}
          </Button>,
          <Button key="close" onClick={() => { setTestTarget(undefined); setTestResult(null); setTestPort(undefined); }}>
            关闭
          </Button>,
        ]}
        width={520}
      >
        {/* 端口设置 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#666', whiteSpace: 'nowrap' }}>目标端口：</span>
          <Input
            type="number"
            min={1}
            max={65535}
            value={testPort}
            onChange={e => setTestPort(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="默认：SSH=22，DB 按类型自动"
            style={{ width: 220 }}
          />
          <span style={{ color: '#999', fontSize: 12 }}>留空使用默认</span>
        </div>

        {testLoading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>正在测试，请稍候…</div>
          </div>
        )}
        {!testLoading && testResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alert
              type={testResult.success ? 'success' : 'error'}
              showIcon
              message={testResult.success ? '测试通过' : '测试失败'}
              description={
                <div style={{ marginTop: 4, lineHeight: '22px' }}>
                  <div><strong>地址：</strong>{testResult.host}:{testResult.port}</div>
                  <div><strong>方式：</strong>{testResult.method}</div>
                  {testResult.credential_name && (
                    <div><strong>凭证：</strong>{testResult.credential_name}</div>
                  )}
                  {testResult.output && (
                    <pre style={{ marginTop: 8, background: testResult.success ? '#f6ffed' : '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {testResult.output}
                    </pre>
                  )}
                  {testResult.error && (
                    <pre style={{ marginTop: 8, background: '#fff2f0', padding: 8, borderRadius: 4, fontSize: 12, color: '#cf1322', whiteSpace: 'pre-wrap' }}>
                      {testResult.error}
                    </pre>
                  )}
                </div>
              }
            />
            {testResult.warning && (
              <Alert type="warning" showIcon message={testResult.warning} />
            )}
          </div>
        )}
        {!testLoading && !testResult && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
            {testTarget?.credential_id
              ? '将使用绑定凭证进行真实登录测试'
              : '未绑定凭证，将进行 TCP 端口连通性检测'}
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default Assets;
