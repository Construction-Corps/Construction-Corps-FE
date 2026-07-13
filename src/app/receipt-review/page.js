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
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Divider,
  Modal,
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
import { useRouter, useSearchParams } from 'next/navigation';
import ThemeSwitch from '../components/ThemeSwitch';
import { fetchJobTread } from '@/utils/JobTreadApi';
import {
  fetchReceiptStagingList,
  fetchReceiptStagingDetail,
  postReceiptStaging,
  undoReceiptStaging,
  rejectReceiptStaging,
  reclassifyReceiptStaging,
  fetchReceiptReviewSettings,
  updateReceiptReviewSettings,
} from '@/utils/ReceiptStagingApi';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PAYMENT_METHODS = ['Capital One Spark', 'Card', 'Cash', 'Check', 'ACH', 'Other'];
const US_DATE = 'MM/DD/YYYY';
const US_DATETIME = 'MM/DD/YYYY h:mm A';
const JT_JOB_URL = (jobId) => (jobId ? `https://app.jobtread.com/jobs/${jobId}` : null);
const JT_BILL_URL = (jobId, billId) =>
  jobId && billId ? `https://app.jobtread.com/jobs/${jobId}/documents/${billId}` : null;
const MISC_ASSIGNMENT = '__use_misc__';

function isMiscAssignment(value) {
  return value === MISC_ASSIGNMENT;
}

function catalogOptionSearchText(option) {
  const d = option || {};
  return [
    d.label,
    d.group_path,
    d.group,
    d.name,
    d.budget_hint,
    d.cost_code_name,
    d.description,
  ].filter(Boolean).join(' ').toLowerCase();
}

function renderCatalogOption(option) {
  const d = option.data || {};
  const groupLabel = d.group_path || d.group;
  const action = d.budget_action === 'add' ? 'Adds to budget' : 'On budget';
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontSize: 11, opacity: 0.65 }}>[{action}] {groupLabel}</div>
      <div>{d.name}{d.budget_hint ? ` · ${d.budget_hint}` : ''}</div>
      {d.duplicate_count > 1 && (
        <div style={{ fontSize: 11, opacity: 0.55 }}>
          {d.duplicate_count} identical API copies — primary row selected
        </div>
      )}
      {d.cost_code_name && (
        <div style={{ fontSize: 11, opacity: 0.55 }}>{d.cost_code_name}</div>
      )}
      {d.description && (
        <div style={{ fontSize: 11, opacity: 0.55 }}>{d.description}</div>
      )}
    </div>
  );
}

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [completedCollapseKeys, setCompletedCollapseKeys] = useState([]);
  const [autoPost, setAutoPost] = useState(false);
  const [autoPostSaving, setAutoPostSaving] = useState(false);
  const suppressTotalsSync = React.useRef(false);
  const restoredFromUrlRef = React.useRef(false);

  const handleAutoPostChange = async (checked) => {
    setAutoPostSaving(true);
    try {
      const settings = await updateReceiptReviewSettings({ auto_post: checked });
      setAutoPost(Boolean(settings.auto_post));
      message.success(
        settings.auto_post
          ? 'Auto-post on — new receipts post without clicking Post'
          : 'Auto-post off — receipts wait for review',
      );
    } catch (err) {
      message.error(err.message || 'Failed to update auto-post');
    } finally {
      setAutoPostSaving(false);
    }
  };

  const syncUrl = useCallback((updates) => {
    const params = new URLSearchParams(window.location.search);
    if ('id' in updates) {
      if (updates.id != null && updates.id !== '') params.set('id', String(updates.id));
      else params.delete('id');
    }
    if ('tab' in updates) {
      if (updates.tab === 'completed') params.set('tab', 'completed');
      else params.delete('tab');
    }
    const qs = params.toString();
    router.replace(qs ? `/receipt-review?${qs}` : '/receipt-review', { scroll: false });
  }, [router]);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [pendingData, postedData, rejectedData, settings] = await Promise.all([
        fetchReceiptStagingList('pending'),
        fetchReceiptStagingList('posted'),
        fetchReceiptStagingList('rejected'),
        fetchReceiptReviewSettings().catch(() => null),
      ]);
      setQueue(pendingData.results || []);
      const done = [...(postedData.results || []), ...(rejectedData.results || [])];
      done.sort((a, b) => {
        const aTime = a.posted_at || a.created_at || '';
        const bTime = b.posted_at || b.created_at || '';
        return bTime.localeCompare(aTime);
      });
      setCompleted(done);
      if (settings && typeof settings.auto_post === 'boolean') {
        setAutoPost(settings.auto_post);
      }
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
    suppressTotalsSync.current = true;
    form.setFieldsValue({
      job_id: row.job_id,
      job_name: row.job_name,
      vendor: ri.vendor,
      date: ri.date ? dayjs(ri.date) : null,
      external_id: ri.external_id,
      total: ri.total,
      subtotal: ri.subtotal,
      tax: ri.tax,
      discount: ri.discount != null ? Math.abs(Number(ri.discount)) : null,
      payment_method: 'Capital One Spark',
      message_text: ri.message_text || row.message_text,
      line_items: (ri.line_items || []).map((li, idx) => ({
        description: li.description,
        amount: li.item_amount != null ? li.item_amount : li.amount,
        budget_item_id: assignments[idx] || null,
      })),
    });
    // Allow Ant Form to finish applying values before live sync resumes.
    setTimeout(() => {
      suppressTotalsSync.current = false;
    }, 0);
  }, [form]);

  const syncDerivedTotals = useCallback((changed, all) => {
    if (suppressTotalsSync.current) return;
    if (detail && detail.status !== 'pending') return;
    const changedKeys = Object.keys(changed || {});
    if (!changedKeys.length) return;

    const linesTouched = changedKeys.includes('line_items');
    const footerTouched = ['subtotal', 'discount', 'tax'].some((k) => changedKeys.includes(k));
    const totalTouchedAlone = changedKeys.includes('total') && !linesTouched && !footerTouched;
    if (totalTouchedAlone) return;

    const lines = all.line_items || [];
    const itemSum = roundMoney(
      lines.reduce((s, li) => s + (Number.isFinite(Number(li?.amount)) ? Number(li.amount) : 0), 0),
    );
    const patch = {};

    if (linesTouched) {
      const curSub = roundMoney(all.subtotal);
      if (Math.abs(curSub - itemSum) >= 0.005) {
        patch.subtotal = itemSum;
      }
    }

    const sub = Object.prototype.hasOwnProperty.call(patch, 'subtotal')
      ? patch.subtotal
      : roundMoney(all.subtotal != null && all.subtotal !== '' ? all.subtotal : itemSum);
    const disc = roundMoney(all.discount);
    const tax = roundMoney(all.tax);
    const expectedTotal = roundMoney(sub - disc + tax);
    const curTotal = roundMoney(all.total);
    if ((linesTouched || footerTouched) && Math.abs(curTotal - expectedTotal) >= 0.005) {
      patch.total = expectedTotal;
    }

    if (Object.keys(patch).length) {
      suppressTotalsSync.current = true;
      form.setFieldsValue(patch);
      setTimeout(() => {
        suppressTotalsSync.current = false;
      }, 0);
    }
  }, [form, detail]);

  const openReceipt = useCallback(async (id, tab = 'pending') => {
    setSelectedId(id);
    if (tab === 'completed') {
      setCompletedCollapseKeys(['completed']);
    }
    syncUrl({ id, tab });
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
  }, [applyDetailToForm, syncUrl]);

  useEffect(() => {
    loadQueue();
    loadJobs();
    loadVendors();
  }, [loadQueue, loadJobs, loadVendors]);

  useEffect(() => {
    if (loadingQueue || restoredFromUrlRef.current) return;
    const urlId = searchParams.get('id');
    const tab = searchParams.get('tab') === 'completed' ? 'completed' : 'pending';
    if (!urlId) {
      if (tab === 'completed') {
        setCompletedCollapseKeys(['completed']);
      }
      return;
    }
    restoredFromUrlRef.current = true;
    if (tab === 'completed') {
      setCompletedCollapseKeys(['completed']);
    }
    openReceipt(urlId, tab);
  }, [loadingQueue, searchParams, openReceipt]);

  const buildPayload = (values) => ({
    job_id: values.job_id,
    job_name: jobs.find((j) => j.id === values.job_id)?.name || values.job_name || '',
    vendor: values.vendor,
    date: values.date ? values.date.format('YYYY-MM-DD') : null,
    external_id: values.external_id,
    total: values.total,
    subtotal: values.subtotal,
    tax: values.tax,
    discount: values.discount != null && values.discount !== '' ? Number(values.discount) : null,
    payment_method: values.payment_method,
    payment_date: values.date ? values.date.format('YYYY-MM-DD') : null,
    message_text: values.message_text,
    line_items: (values.line_items || []).map((li) => ({
      description: li.description,
      amount: Number(li.amount),
      item_amount: Number(li.amount),
    })),
    line_assignments: (values.line_items || []).map((li) => li.budget_item_id || null),
  });

  const watchedLines = Form.useWatch('line_items', form) || [];
  const watchedTotal = Form.useWatch('total', form);
  const watchedTax = Form.useWatch('tax', form);
  const watchedDiscount = Form.useWatch('discount', form);
  const watchedSubtotal = Form.useWatch('subtotal', form);

  const adjPreview = useMemo(() => {
    const items = (watchedLines || [])
      .map((li) => ({
        description: li?.description,
        amount: Number(li?.amount),
      }))
      .filter((li) => Number.isFinite(li.amount));
    const itemSum = items.reduce((s, li) => s + li.amount, 0);
    const total = Number(watchedTotal);
    if (!Number.isFinite(total) || items.length === 0 || Math.abs(itemSum) < 0.005) {
      return { lines: items.map((li) => ({ ...li, adj: li.amount })), itemSum, adjSum: itemSum };
    }
    let remaining = Math.round(total * 100) / 100;
    const lines = items.map((li, i) => {
      let adj;
      if (i === items.length - 1) {
        adj = remaining;
      } else {
        adj = Math.round((li.amount * total) / itemSum * 100) / 100;
        remaining = Math.round((remaining - adj) * 100) / 100;
      }
      return { ...li, adj };
    });
    return {
      lines,
      itemSum: Math.round(itemSum * 100) / 100,
      adjSum: Math.round(lines.reduce((s, li) => s + li.adj, 0) * 100) / 100,
    };
  }, [watchedLines, watchedTotal]);

  const footerCheck = useMemo(() => {
    const sub = Number(watchedSubtotal);
    const tax = Number(watchedTax) || 0;
    const disc = Number(watchedDiscount) || 0;
    const total = Number(watchedTotal);
    if (![sub, total].every(Number.isFinite)) return null;
    const expected = Math.round((sub - disc + tax) * 100) / 100;
    if (Math.abs(expected - total) < 0.02) return null;
    return `Footer check: subtotal $${sub.toFixed(2)} − discount $${disc.toFixed(2)} + tax $${tax.toFixed(2)} = $${expected.toFixed(2)}, but total is $${total.toFixed(2)}`;
  }, [watchedSubtotal, watchedTax, watchedDiscount, watchedTotal]);

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
      if (err?.errorFields) {
        const first = err.errorFields[0];
        const fieldMsg = first?.errors?.[0] || 'Fix required fields before continuing';
        message.error(fieldMsg);
        if (first?.name) form.scrollToField(first.name);
        return;
      }
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
      syncUrl({ id: null, tab: null });
      loadQueue();
    } catch (err) {
      if (err?.errorFields) {
        const first = err.errorFields[0];
        const fieldMsg = first?.errors?.[0] || 'Fix required fields before posting';
        message.error(fieldMsg);
        if (first?.name) form.scrollToField(first.name);
        return;
      }
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
      syncUrl({ id: null, tab: null });
      loadQueue();
    } catch (err) {
      message.error(err.message || 'Failed to reject receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = () => {
    if (!selectedId) return;
    const billId = detail?.bill_id || detail?.bill_result?.bill_id;
    Modal.confirm({
      title: 'Undo this JobTread bill?',
      content: (
        <div>
          <p>
            This permanently deletes the payment, bill
            {billId ? ` (${billId})` : ''}, attached receipt files, and any
            budget items this post created. Existing budget lines that were only
            reused stay. The review returns to Pending so you can fix and re-post.
          </p>
        </div>
      ),
      okText: 'Delete payment + bill',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setSubmitting(true);
        try {
          const result = await undoReceiptStaging(selectedId);
          message.success('Undone — bill removed; review is pending again');
          const row = result.staging;
          setDetail(row);
          if (row?.status === 'pending') {
            applyDetailToForm(row);
            syncUrl({ id: row.id, tab: 'pending' });
          }
          loadQueue();
        } catch (err) {
          message.error(err.message || 'Failed to undo');
          throw err;
        } finally {
          setSubmitting(false);
        }
      },
    });
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
  const canUndoBill = Boolean(
    selectedId && (detail?.bill_id || detail?.bill_result?.bill_id),
  );
  const catalogSelectOptions = useMemo(() => [
    {
      value: MISC_ASSIGNMENT,
      label: '[Adds to budget] Use Miscellaneous (auto-create category bucket)',
      group: 'Miscellaneous',
      name: 'Auto-create from receipt line',
      budget_action: 'add',
      is_misc: true,
    },
    ...catalogOptions.map((o) => ({
      value: o.id,
      label: o.label,
      group: o.group,
      group_path: o.group_path,
      name: o.name,
      description: o.description,
      cost_code_name: o.cost_code_name,
      budget_action: o.budget_action || 'reuse',
      budget_hint: o.budget_hint,
      duplicate_count: o.duplicate_count,
    })),
  ], [catalogOptions]);

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Receipt Review</Title>
          <Text type="secondary">Review OCR + budget coding suggestions, edit, then post bill + payment</Text>
        </div>
        <Space>
          <Space size={8}>
            <Text type="secondary">Auto-post</Text>
            <Switch
              checked={autoPost}
              loading={autoPostSaving}
              onChange={handleAutoPostChange}
              checkedChildren="On"
              unCheckedChildren="Off"
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={loadQueue} loading={loadingQueue}>
            Refresh
          </Button>
        </Space>
      </Space>

      {autoPost && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Auto-post is on — new Slack receipts post to JobTread without the Post button. They still appear under Completed."
        />
      )}

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
                onClick: () => openReceipt(record.id, 'pending'),
                style: {
                  cursor: 'pointer',
                  background: record.id === selectedId ? 'rgba(22, 119, 255, 0.08)' : undefined,
                },
              })}
            />
          </Card>
          <Collapse
            size="small"
            activeKey={completedCollapseKeys}
            onChange={(keys) => {
              const open = Array.isArray(keys) ? keys.includes('completed') : keys === 'completed';
              const nextKeys = open ? ['completed'] : [];
              setCompletedCollapseKeys(nextKeys);
              syncUrl({ tab: open ? 'completed' : 'pending', id: selectedId });
            }}
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
                      onClick: () => openReceipt(record.id, 'completed'),
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
              selectedId ? (
                <Space>
                  {canUndoBill && (
                    <Button danger onClick={handleUndo} disabled={submitting} loading={submitting}>
                      Undo bill
                    </Button>
                  )}
                  {isPendingDetail && (
                    <>
                      <Button danger icon={<CloseOutlined />} onClick={handleReject} disabled={submitting}>
                        Reject
                      </Button>
                      <Button type="primary" icon={<CheckOutlined />} onClick={handlePost} loading={submitting}>
                        Post Bill + Pay
                      </Button>
                    </>
                  )}
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
                  <Form
                    form={form}
                    layout="vertical"
                    size="middle"
                    disabled={!isPendingDetail}
                    onValuesChange={syncDerivedTotals}
                    scrollToFirstError
                  >
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
                      <Col span={6}>
                        <Form.Item name="subtotal" label="Subtotal">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="discount" label="Discount">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="tax" label="Tax">
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="total" label="Total" rules={[{ required: true, message: 'Total required' }]}>
                          <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                        </Form.Item>
                      </Col>
                    </Row>
                    {footerCheck && (
                      <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={footerCheck} />
                    )}
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      message="Live math: Item lines → Subtotal; Subtotal − Discount + Tax → Total; tax/discount spread into Adj. You can still override Total directly."
                    />

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
                          <Row gutter={8} style={{ marginBottom: 4, color: '#888', fontSize: 12 }}>
                            <Col flex="auto">Description</Col>
                            <Col span={4}>Item</Col>
                            <Col span={4}>Adj</Col>
                            <Col style={{ width: 20 }} />
                          </Row>
                          {fields.map(({ key, name, ...restField }) => {
                            const filing = (detail?.line_filing || [])[name];
                            const adj = adjPreview.lines[name]?.adj;
                            const selectedId = watchedLines?.[name]?.budget_item_id;
                            const isMiscPick = isMiscAssignment(selectedId);
                            const selectedOpt = catalogOptions.find((o) => o.id === selectedId);
                            const destGroup = isMiscPick ? 'Miscellaneous' : (selectedOpt?.group || filing?.group || '—');
                            const destItem = isMiscPick
                              ? '(auto-create category bucket on post)'
                              : (selectedOpt?.name || filing?.item || '—');
                            const destSrc = isMiscPick
                              ? 'misc(explicit)'
                              : (filing?.src || (selectedId ? 'manual' : null));
                            return (
                            <div
                              key={key}
                              style={{
                                marginBottom: 12,
                                padding: 10,
                                border: '1px solid #f0f0f0',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.02)',
                              }}
                            >
                              <Row gutter={8} align="middle">
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
                                <Col span={4}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'amount']}
                                    rules={[{ required: true, message: 'Amount required' }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} prefix="$" />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <InputNumber
                                    style={{ width: '100%' }}
                                    value={adj != null ? adj : undefined}
                                    precision={2}
                                    prefix="$"
                                    disabled
                                  />
                                </Col>
                                <Col>
                                  <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                                </Col>
                              </Row>
                              <Row gutter={8} style={{ marginTop: 8 }} align="middle">
                                <Col span={24}>
                                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Lands in
                                  </Text>
                                  <Space wrap size={[8, 4]} style={{ marginBottom: 6 }}>
                                    <Tag color="blue">{destGroup}</Tag>
                                    <Text strong style={{ fontSize: 13 }}>{destItem}</Text>
                                        {destSrc && (
                                      <Tag>
                                        {destSrc === 'llm' ? 'AI match'
                                          : destSrc === 'match' ? 'Keyword match'
                                          : destSrc === 'misc' || destSrc === 'misc(explicit)' ? 'Miscellaneous'
                                          : destSrc === 'manual' ? 'Manual'
                                          : destSrc}
                                      </Tag>
                                    )}
                                  </Space>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'budget_item_id']}
                                    rules={[{
                                      validator: (_, value) => (
                                        isMiscAssignment(value) || value
                                          ? Promise.resolve()
                                          : Promise.reject(new Error('Budget line required'))
                                      ),
                                    }]}
                                    style={{ marginBottom: 0 }}
                                  >
                                    <Select
                                      showSearch
                                      placeholder="Change budget item"
                                      optionLabelProp="label"
                                      options={catalogSelectOptions}
                                      optionRender={renderCatalogOption}
                                      filterOption={(input, option) => (
                                        catalogOptionSearchText(option).includes(input.toLowerCase())
                                      )}
                                    />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
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
                          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                            Item sum ${Number(adjPreview.itemSum || 0).toFixed(2)} → Adj sum ${Number(adjPreview.adjSum || 0).toFixed(2)}
                            {watchedTotal != null ? ` (total $${Number(watchedTotal).toFixed(2)})` : ''}
                          </Text>
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
