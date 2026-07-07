import { toast } from 'react-toastify';

const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ccbe.onrender.com').replace(/\/$/, '');

const _authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }
  return headers;
};

const _handleResponse = async (response) => {
  if (response.status === 401) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    if (typeof window !== 'undefined') {
      toast.error('Your session has expired. Please log in again.');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchReceiptStagingList = async (status = 'pending') => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/?status=${encodeURIComponent(status)}`, {
    headers: _authHeaders(),
  });
  return _handleResponse(response);
};

export const fetchReceiptStagingDetail = async (id) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/`, {
    headers: _authHeaders(),
  });
  return _handleResponse(response);
};

export const updateReceiptStaging = async (id, payload) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/`, {
    method: 'PATCH',
    headers: _authHeaders(),
    body: JSON.stringify(payload),
  });
  return _handleResponse(response);
};

export const postReceiptStaging = async (id, payload = null) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/post/`, {
    method: 'POST',
    headers: _authHeaders(),
    body: payload ? JSON.stringify(payload) : '{}',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || data.bill_result?.reason || `Post failed (${response.status})`);
    err.data = data;
    throw err;
  }
  return data;
};

export const rejectReceiptStaging = async (id) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/reject/`, {
    method: 'POST',
    headers: _authHeaders(),
    body: '{}',
  });
  return _handleResponse(response);
};

export const reclassifyReceiptStaging = async (id, payload = {}) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/reclassify/`, {
    method: 'POST',
    headers: _authHeaders(),
    body: JSON.stringify(payload),
  });
  return _handleResponse(response);
};
