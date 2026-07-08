'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  Divider,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ThemeSwitch from '../components/ThemeSwitch';
import { fetchJobTread } from '@/utils/JobTreadApi';
import {
  fetchReceiptStagingList,
  fetchReceiptStagingDetail,
  postReceiptStaging,
  rejectReceiptStaging,
  reclassifyReceiptStaging,
} from '@/utils/ReceiptStagingApi';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PAYMENT_METHODS = ['Card', 'Cash', 'Check', 'ACH', 'Other'];
const US_DATE = 'MM/DD/YYYY';
const US_DATETIME = 'MM/DD/YYYY h:mm A';
const JT_JOB_URL = (jobId) => (jobId ? `https://app.jobtread.com/jobs/${jobId}` : null);
const JT_BILL_URL = (jobId, billId) =>
  jobId && billId ? `https://app.jobtread.com/jobs/${jobId}?documentId=${billId}` : null;

function formatUsDateTime(value) {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(US_DATETIME) : String(value);
}

function ReceiptPreview({ images }) {
  const [zoom, setZoom] = useState(1);
  const primary = (images || [])[0];

  useEffect(() => {
    setZoom(1);
  }, [primary?.url]);

  if (!primary?.url) {
    return <Alert type="info" message="No preview available" />;
  }
  const isPdf =
    (primary.mimetype || '').includes('pdf') ||
    primary.url.toLowerCase().includes('.pdf');

  const zoomControls = (
    <Space style={{ marginBottom: 8 }}>
      <Button
        size="small"
        icon={<ZoomOutOutlined />}
        onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
        disabled={zoom <= 0.5}
      />
      <Text style={{ minWidth: 48, textAlign: 'center', display: 'inline-block' }}>
        {Math.round(zoom * 100)}%
      </Text>
      <Button
        size="small"
        icon={<ZoomInOutlined />}
        onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
        disabled={zoom >= 3}
      />
      <Button size="small" icon={<ExpandOutlined />} onClick={() => setZoom(1)}>
        Reset
      </Button>
    </Space>
  );

  if (isPdf) {
    return (
      <div>
        {zoomControls}
        <div style={{ overflow: 'auto', maxHeight: '70vh', border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <iframe
            title="Receipt PDF"
            src={primary.url}
            style={{
              width: `${zoom * 100}%`,
              height: `${Math.max(70, zoom * 70)}vh`,
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div>
      {zoomControls}
      <div
        style={{
          overflow: 'auto',
          maxHeight: '70vh',
          textAlign: 'center',
          border: '1px solid #d9d9d9',
          borderRadius: 8,
          padding: 8,
        }}
      >
        <img
          alt={primary.name || 'Receipt'}
          src={primary.url}
          style={{
            width: `${zoom * 100}%`,
            maxWidth: 'none',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>
      {(images || []).length > 1 && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {images.length} images attached to this receipt
        </Text>
      )}
    </div>
  );
}

function ReceiptReviewWorkspace() {
  const [form] = Form.useForm();
  const [queue, setQueue] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [pendingData, postedData, rejectedData] = await Promise.all([
        fetchReceiptStagingList('pending'),
        fetchReceiptStagingList('posted'),
        fetchReceiptStagingList('rejected'),
      ]);
      setQueue(pendingData.results || []);
      const done = [...(postedData.results || []), ...(rejectedData.results || [])];
      done.sort((a, b) => {
        const aTime = a.posted_at || a.created_at || '';
        const bTime = b.posted_at || b.created_at || '';
        return bTime.localeCompare(aTime);
      });
      setCompleted(done);
    } catch (err) {
      message.error(err.message || 'Failed to load receipt queue');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      let allJobs = [];
      let nextPage = null;
      let hasMore = true;
      while (hasMore) {
        const jobsQuery = {
          organization: {
            id: {},
            jobs: {
              $: {
                size: 100,
                ...(nextPage && { page: nextPage }),
                sortBy: [{ field: 'name', order: 'asc' }],
                where: { and: [['closedOn', '=', null]] },
              },
              nextPage: {},
              nodes: { id: {}, name: {} },
            },
          },
        };
        const data = await fetchJobTread(jobsQuery);
        const jobData = data?.organization?.jobs;
        if (jobData?.nodes) {
          allJobs = allJobs.concat(jobData.nodes);
        }
        nextPage = jobData?.nextPage;
        hasMore = !!nextPage;
      }
      setJobs(allJobs);
    } catch (err) {
      console.error('Failed to load jobs', err);
    }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      let allVendors = [];
      let nextPage = null;
      let hasMore = true;
      while (hasMore) {
        const vendorsQuery = {
          organization: {
            id: {},
            accounts: {
              $: {
                ...(nextPage && { page: nextPage }),
                where: ['type', '=', 'vendor'],
                size: 100,
              },
              nextPage: {},
              nodes: { id: {}, name: {} },
            },
          },
        };
        const data = await fetchJobTread(vendorsQuery);
        const vendorData = data?.organization?.accounts;
        if (vendorData?.nodes) {
          allVendors = allVendors.concat(vendorData.nodes);
        }
        nextPage = vendorData?.nextPage;
        hasMore = !!nextPage;
      }
      setVendors(allVendors);
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  }, []);

  const applyDetailToForm = useCallback((row) => {
    const ri = row.receipt_input || {};
    const assignments = row.line_assignments || ri.line_assignments || [];
    setCatalogOptions(row.catalog_options || []);
    form.setFieldsValue({
      job_id: row.job_id,
      job_name: row.job_name,
      vendor: ri.vendor,
      date: ri.date ? dayjs(ri.date) : null,
      external_id: ri.external_id,
      total: ri.total,
      subtotal: ri.subtotal,
      tax: ri.tax,
      payment_method: ri.payment_method || 'Card',
      message_text: ri.message_text || row.message_text,
      line_items: (ri.line_items || []).map((li, idx) => ({
        description: li.description,
        amount: li.amount,
        budget_item_id: assignments[idx] || null,
      })),
    });
  }, [form]);

  const openReceipt = useCallback(async (id) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const row = await fetchReceiptStagingDetail(id);
      setDetail(row);
      applyDetailToForm(row);
    } catch (err) {
      message.error(err.message || 'Failed to load receipt');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [applyDetailToForm]);

  useEffect(() => {
    loadQueue();
    loadJobs();
    loadVendors();
  }, [loadQueue, loadJobs, loadVendors]);

  const buildPayload = (values) => ({
    job_id: values.job_id,
    job_name: jobs.find((j) => j.id === values.job_id)?.name || values.job_name || '',
    vendor: values.vendor,
    date: values.date ? values.date.format('YYYY-MM-DD') : null,
    external_id: values.external_id,
    total: values.total,
    subtotal: values.subtotal,
    tax: values.tax,
    payment_method: values.payment_method,
    payment_date: values.date ? values.date.format('YYYY-MM-DD') : null,
    message_text: values.message_text,
    line_items: (values.line_items || []).map((li) => ({
      description: li.description,
      amount: Number(li.amount),
    })),
    line_assignments: (values.line_items || []).map((li) => li.budget_item_id || null),
  });

  const handleJobChange = async (jobId) => {
    if (!selectedId) return;
    const job = jobs.find((j) => j.id === jobId);
    form.setFieldValue('job_name', job?.name || '');
    setSubmitting(true);
    try {
      const values = form.getFieldsValue();
      const payload = { ...buildPayload({ ...values, job_id: jobId, job_name: job?.name }), reclassify: true };
      const row = await reclassifyReceiptStaging(selectedId, payload);
      setDetail(row);
      applyDetailToForm(row);
      message.success('Budget coding refreshed for job');
    } catch (err) {
      message.error(err.message || 'Failed to refresh budget coding');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReclassify = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const payload = { ...buildPayload(values), reclassify: true };
      const row = await reclassifyReceiptStaging(selectedId, payload);
      setDetail(row);
      applyDetailToForm(row);
      message.success('Budget suggestions updated');
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to reclassify lines');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!selectedId) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = buildPayload(values);
      const result = await postReceiptStaging(selectedId, payload);
      const billId = result.bill_result?.bill_id || result.staging?.bill_id;
      const jobId = result.staging?.job_id || payload.job_id;
      const jobName = result.staging?.job_name || payload.job_name || jobId;
      const jobUrl = result.staging?.job_url || JT_JOB_URL(jobId);
      const billUrl = result.staging?.bill_url || JT_BILL_URL(jobId, billId);
      message.success({
        duration: 10,
        content: (
          <span>
            Posted{billId ? ` bill ${billId}` : ''}.{' '}
            {billUrl && (
              <a href={billUrl} target="_blank" rel="noopener noreferrer">
                Open bill
              </a>
            )}
            {billUrl && jobUrl ? ' · ' : ''}
            {jobUrl && (
              <a href={jobUrl} target="_blank" rel="noopener noreferrer">
                Open job{jobName ? ` (${jobName})` : ''}
              </a>
            )}
          </span>
        ),
      });
      setSelectedId(null);
      setDetail(null);
      form.resetFields();
      loadQueue();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to post receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await rejectReceiptStaging(selectedId);
      message.info('Receipt rejected');
      setSelectedId(null);
      setDetail(null);
      form.resetFields();
      loadQueue();
    } catch (err) {
      message.error(err.message || 'Failed to reject receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(() => [
    {
      title: 'When',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v) => formatUsDateTime(v),
    },
    {
      title: 'Job',
      dataIndex: 'job_name',
      key: 'job_name',
      ellipsis: true,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      ellipsis: true,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (v) => (v != null ? `$${Number(v).toFixed(2)}` : '—'),
    },
    {
      title: 'From',
      dataIndex: 'sender_name',
      key: 'sender_name',
      ellipsis: true,
    },
  ], []);

  const completedColumns = useMemo(() => [
    {
      title: 'When',
      key: 'when',
      width: 150,
      render: (_, row) => formatUsDateTime(row.posted_at || row.created_at),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v) => (
        <Tag color={v === 'posted' ? 'green' : 'default'}>
          {v === 'posted' ? 'Posted' : 'Rejected'}
        </Tag>
      ),
    },
    {
      title: 'Job',
      dataIndex: 'job_name',
      key: 'job_name',
      ellipsis: true,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor',
      key: 'vendor',
      ellipsis: true,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 90,
      render: (v) => (v != null ? `$${Number(v).toFixed(2)}` : '—'),
    },
    {
      title: 'Links',
      key: 'links',
      width: 110,
      render: (_, row) => {
        const jobUrl = row.job_url || JT_JOB_URL(row.job_id);
        const billUrl = row.bill_url || JT_BILL_URL(row.job_id, row.bill_id);
        if (!jobUrl && !billUrl) return '—';
        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {billUrl && (
              <a href={billUrl} target="_blank" rel="noopener noreferrer" title="Open bill">
                Bill
              </a>
            )}
            {jobUrl && (
              <a href={jobUrl} target="_blank" rel="noopener noreferrer" title="Open job">
                Job
              </a>
            )}
          </Space>
        );
      },
    },
  ], []);

  const vendorOptions = vendors.map((v) => ({ value: v.name, label: v.name }));
  const isPendingDetail = detail?.status === 'pending';

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Receipt Review</Title>
          <Text type="secondary">Review OCR + budget coding suggestions, edit, then post bill + payment</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadQueue} loading={loadingQueue}>
          Refresh
        </Button>
      </Space>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card title={`Pending (${queue.length})`} size="small" style={{ marginBottom: 12 }}>
            <Table
              rowKey="id"
              size="small"
              loading={loadingQueue}
              dataSource={queue}
              columns={columns}
              pagination={false}
              scroll={{ y: 360 }}
              onRow={(record) => ({
                onClick: () => openReceipt(record.id),
                style: {
                  cursor: 'pointer',
                  background: record.id === selectedId ? 'rgba(22, 119, 255, 0.08)' : undefined,
                },
              })}
            />
          </Card>
          <Collapse
            size="small"
            items={[
              {
                key: 'completed',
                label: `Completed (${completed.length})`,
                children: (
                  <Table
                    rowKey="id"
                    size="small"
                    loading={loadingQueue}
                    dataSource={completed}
                    columns={completedColumns}
                    pagination={{ pageSize: 10, size: 'small' }}
                    scroll={{ y: 280 }}
                    onRow={(record) => ({
                      onClick: () => openReceipt(record.id),
                      style: {
                        cursor: 'pointer',
                        background: record.id === selectedId ? 'rgba(22, 119, 255, 0.08)' : undefined,
                      },
                    })}
                  />
                ),
              },
            ]}
          />
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={selectedId ? `Review #${selectedId}` : 'Select a receipt'}
            size="small"
            extra={
              selectedId && isPendingDetail ? (
                <Space>
                  <Button danger icon={<CloseOutlined />} onClick={handleReject} disabled={submitting}>
                    Reject
                  </Button>
                  <Button type="primary" icon={<CheckOutlined />} onClick={handlePost} loading={submitting}>
                    Post Bill + Pay
                  </Button>
                </Space>
              ) : null
            }
          >
            {!selectedId ? (
              <Alert type="info" message="Pick a receipt from the queue to preview and edit before posting." />
            ) : loadingDetail ? (
              <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
            ) : (
              <Row gutter={16}>
                <Col xs={24} xl={12}>
                  <ReceiptPreview images={detail?.images} />
                  {detail?.uncertain_fields?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary">OCR uncertain: </Text>
                      {detail.uncertain_fields.map((f) => (
                        <Tag key={f} color="orange">{f}</Tag>
                      ))}
                    </div>
                  )}
                  {detail?.sender_name && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                      Slack: {detail.sender_name}
                      {detail.message_text ? ` — ${detail.message_text}` : ''}
                    </Text>
                  )}
                  {detail?.status && detail.status !== 'pending' && (
                    <Alert
                      style={{ marginTop: 12 }}
                      type={detail.status === 'posted' ? 'success' : 'warning'}
                      showIcon
                      message={
                        detail.status === 'posted'
                          ? `Posted ${formatUsDateTime(detail.posted_at)}`
                          : 'Rejected'
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          {(detail.bill_url || JT_BILL_URL(detail.job_id, detail.bill_id || detail.bill_result?.bill_id)) && (
                            <a
                              href={detail.bill_url || JT_BILL_URL(detail.job_id, detail.bill_id || detail.bill_result?.bill_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <LinkOutlined /> Open bill in JobTread
                            </a>
                          )}
                          {(detail.job_url || JT_JOB_URL(detail.job_id)) && (
                            <a
                              href={detail.job_url || JT_JOB_URL(detail.job_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <LinkOutlined /> Open job in JobTread
                            </a>
                          )}
                        </Space>
                      }
                    />
                  )}
                </Col>
                <Col xs={24} xl={12}>
                  <Form form={form} layout="vertical" size="middle" disabled={!isPendingDetail}>
                    <Form.Item name="job_id" label="Job" rules={[{ required: true, message: 'Job required' }]}>
                      <Select
                        showSearch
                        placeholder="Select job"
                        optionFilterProp="label"
                        options={jobs.map((j) => ({ value: j.id, label: j.name }))}
                        onChange={handleJobChange}
                      />
                    </Form.Item>
                    <Form.Item name="job_name" hidden><Input /></Form.Item>

                    <Form.Item name="vendor" label="Vendor" rules={[{ required: true, message: 'Vendor required' }]}>
                      <AutoComplete
                        options={vendorOptions}
                        placeholder="Vendor name"
                        filterOption={(input, option) =>
                          (option?.value || '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>

                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item name="date" label="Receipt date">
                          <DatePicker style={{ width: '100%' }} format={US_DATE} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="payment_method" label="Payment method">
                          <Select options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="external_id" label="Order / receipt #">
                      <Input placeholder="externalId for duplicate detection" />
                    </Form.Item>

                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="subtotal" label="Subtotal">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="tax" label="Tax">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="total" label="Total" rules={[{ required: true, message: 'Total required' }]}>
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="message_text" label="Slack caption / memo">
                      <TextArea rows={2} />
                    </Form.Item>

                    <Divider orientation="left" plain>Line items + budget coding</Divider>
                    {(detail?.line_filing || []).length > 0 && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Budget matched before review — edit coding below if needed."
                      />
                    )}
                    <Form.List name="line_items">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => {
                            const filing = (detail?.line_filing || [])[name];
                            return (
                            <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                              <Col flex="auto">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'description']}
                                  rules={[{ required: true, message: 'Description required' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="Item description" />
                                </Form.Item>
                              </Col>
                              <Col span={7}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'budget_item_id']}
                                  rules={[{ required: true, message: 'Budget line required' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select
                                    showSearch
                                    placeholder="Budget item"
                                    optionFilterProp="label"
                                    options={catalogOptions.map((o) => ({
                                      value: o.id,
                                      label: o.label,
                                    }))}
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={5}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'amount']}
                                  rules={[{ required: true, message: 'Amount required' }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                                </Form.Item>
                              </Col>
                              <Col>
                                <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                              </Col>
                              {filing?.src && (
                                <Col span={24}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Suggested: {filing.group} → {filing.item} ({filing.src})
                                  </Text>
                                </Col>
                              )}
                            </Row>
                            );
                          })}
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} disabled={!isPendingDetail}>
                              Add line item
                            </Button>
                            <Button onClick={handleReclassify} disabled={submitting || !isPendingDetail}>
                              Re-match budget lines
                            </Button>
                          </Space>
                        </>
                      )}
                    </Form.List>
                  </Form>
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function ReceiptReviewPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <ThemeSwitch />
      <Content>
        <ReceiptReviewWorkspace />
      </Content>
    </Layout>
  );
}
