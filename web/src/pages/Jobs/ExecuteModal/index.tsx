import React, { useState } from 'react';
import { Modal, Form, Select, Input, Button, Table, Tag, message, Spin } from 'antd';
import { createJobExecution } from '../../../services/jobs';
import { getAssets } from '../../../services/assets';

interface Props {
  template?: any;
  open: boolean;
  onClose: () => void;
}

const ExecuteModal: React.FC<Props> = ({ template, open, onClose }) => {
  const [form] = Form.useForm();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  React.useEffect(() => {
    if (open) {
      getAssets({ limit: 200 }).then((res: any) => {
        if (Array.isArray(res)) setAssets(res.filter((a: any) => a.type === 'host' || a.ip_address));
      });
      if (template) {
        form.setFieldsValue({ name: `执行: ${template.name}`, script: template.script });
      }
    }
  }, [open, template]);

  const handleExecute = async () => {
    const values = await form.validateFields();
    setLoading(true);
    setResult(null);
    try {
      const res = await createJobExecution({
        template_id: template?.id,
        ...values,
      });
      setResult(res);
      message.success('执行完成');
    } catch (e: any) {
      message.error('执行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="执行作业"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>关闭</Button>,
        <Button key="run" type="primary" loading={loading} onClick={handleExecute}>
          立即执行
        </Button>,
      ]}
    >
      <Spin spinning={loading} tip="正在执行...">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="执行名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="targets" label="目标主机">
            <Select mode="multiple" placeholder="选择目标主机（留空则不执行SSH）"
              options={assets.map((a: any) => ({
                label: `${a.name} (${a.ip_address})`,
                value: a.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="script" label="执行脚本" rules={[{ required: true }]}>
            <Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>

        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Tag color={result.status === 'completed' ? 'green' : 'red'}>
                {result.status === 'completed' ? '执行完成' : '执行失败'}
              </Tag>
              成功: {result.summary?.success || 0} / 失败: {result.summary?.failed || 0} / 共: {result.summary?.total || 0}
            </div>
            <Table
              size="small"
              rowKey="id"
              dataSource={result.logs || []}
              columns={[
                { title: '主机', dataIndex: 'host' },
                {
                  title: '状态', dataIndex: 'status',
                  render: (v: any) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v}</Tag>,
                },
                { title: '退出码', dataIndex: 'exit_code' },
                { title: '输出', dataIndex: 'stdout', ellipsis: true },
                { title: '错误', dataIndex: 'stderr', ellipsis: true },
              ]}
            />
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default ExecuteModal;
