'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Input, Layout, Row, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ProtectedRoute from '../../components/ProtectedRoute';
import { fetchAutomationRun, fetchAutomationRuns, fetchAutomationsOverview } from '@/utils/AutomationsApi';

const { Content } = Layout;
const { Text, Title } = Typography;

const STATUS_COLORS = { ok: 'green', partial: 'orange', error: 'red', skipped: 'default', running: 'blue' };
const RESULT_COLORS = { ok: 'green', error: 'red', dry_run: 'gold' };
const PAGE_SIZE = 50;

const formatTime = (value) => (value ? dayjs(value).format('MM/DD/YYYY h:mm A') : '—');

function StepList({ runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAutomationRun(runId).then(setRun).catch((e) => setError(e.message));
  }, [runId]);

  if (error) return <Alert type="error" message={error} />;
  if (!run) return <Spin />;
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {(run.steps || []).map((step, index) => (
        <div key={index}>
          <Space wrap>
            <Text strong>{step.step}</Text>
            {step.kind === 'note' ? <Tag>note</Tag> : <Tag color={RESULT_COLORS[step.result]}>{step.result === 'dry_run' ? 'would run (dry run)' : step.result}</Tag>}
          </Space>
          {step.error && <Alert type="error" message={step.error} style={{ marginTop: 4 }} />}
          {step.detail && Object.keys(step.detail).length > 0 && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: '4px 0 0' }}>{JSON.stringify(step.detail, null, 2)}</pre>
          )}
        </div>
      ))}
      {(run.steps || []).length === 0 && <Text type="secondary">No steps recorded.</Text>}
      {run.error && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#ff7875' }}>{run.error}</pre>}
    </Space>
  );
}

function AutomationsPage() {
  const [overview, setOverview] = useState([]);
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ automation: undefined, status: undefined, live: undefined, q: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, list] = await Promise.all([
        fetchAutomationsOverview(),
        fetchAutomationRuns({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      ]);
      setOverview(ov.automations || []);
      setRuns(list.items || []);
      setTotal(list.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const columns = [
    { title: 'When', dataIndex: 'created_at', width: 170, render: formatTime },
    { title: 'Automation', dataIndex: 'label', width: 220 },
    {
      title: 'Mode',
      dataIndex: 'live',
      width: 90,
      render: (live) => (live ? <Tag color="green">live</Tag> : <Tag color="gold">dry run</Tag>),
    },
    {
      title: 'Result',
      dataIndex: 'status',
      width: 110,
      render: (status, row) => (
        <Space size={4}>
          <Tag color={STATUS_COLORS[status]}>{status}</Tag>
          {row.has_error && status === 'ok' ? <Tag color="red">error</Tag> : null}
        </Space>
      ),
    },
    { title: 'What', dataIndex: 'summary', ellipsis: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '56px 16px 16px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
          <Title level={3} style={{ margin: 0 }}>Automations</Title>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
        </Space>
        <Text type="secondary">
          Dry run means the automation ran its lookups and recorded what it would do, without sending or writing anything.
        </Text>

        {error && <Alert type="error" message={error} style={{ marginTop: 12 }} />}

        <Row gutter={[12, 12]} style={{ margin: '16px 0' }}>
          {overview.map((a) => (
            <Col key={a.key} xs={24} sm={12} md={8} lg={6}>
              <Card
                size="small"
                hoverable
                onClick={() => setFilter('automation', filters.automation === a.key ? undefined : a.key)}
                style={filters.automation === a.key ? { borderColor: '#1677ff' } : undefined}
                title={a.label}
                extra={a.live ? <Tag color="green">live</Tag> : <Tag color="gold">dry run</Tag>}
              >
                <Space wrap size={4}>
                  {Object.entries(a.counts).map(([status, n]) => (
                    <Tag key={status} color={STATUS_COLORS[status]}>{status}: {n}</Tag>
                  ))}
                  {Object.keys(a.counts).length === 0 && <Text type="secondary">No runs yet</Text>}
                </Space>
                <div><Text type="secondary" style={{ fontSize: 12 }}>Last run: {formatTime(a.last_run)}</Text></div>
              </Card>
            </Col>
          ))}
        </Row>

        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Automation"
            style={{ width: 240 }}
            value={filters.automation}
            onChange={(v) => setFilter('automation', v)}
            options={overview.map((a) => ({ value: a.key, label: a.label }))}
          />
          <Select
            allowClear
            placeholder="Result"
            style={{ width: 140 }}
            value={filters.status}
            onChange={(v) => setFilter('status', v)}
            options={Object.keys(STATUS_COLORS).map((s) => ({ value: s, label: s }))}
          />
          <Select
            allowClear
            placeholder="Mode"
            style={{ width: 120 }}
            value={filters.live}
            onChange={(v) => setFilter('live', v)}
            options={[{ value: 'true', label: 'live' }, { value: 'false', label: 'dry run' }]}
          />
          <Input.Search
            allowClear
            placeholder="Search name, subject, error"
            style={{ width: 280 }}
            onSearch={(v) => setFilter('q', v)}
          />
        </Space>

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={runs}
          expandable={{ expandedRowRender: (row) => <StepList runId={row.id} /> }}
          pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, onChange: setPage }}
          scroll={{ x: 800 }}
        />
      </Content>
    </Layout>
  );
}

export default function AutomationsRoute() {
  return (
    <ProtectedRoute>
      <AutomationsPage />
    </ProtectedRoute>
  );
}
