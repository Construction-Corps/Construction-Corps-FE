const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ccbe.onrender.com').replace(/\/$/, '');

const _reviewerEmail = () => {
  if (typeof localStorage === 'undefined') return '';
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.email || '';
  } catch {
    return '';
  }
};

const _authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }
  const reviewer = _reviewerEmail();
  if (reviewer) {
    headers['X-CC-Reviewer'] = reviewer;
  }
  return headers;
};

const _handleResponse = async (response) => {
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
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const undoReceiptStaging = async (id) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/undo/`, {
    method: 'POST',
    headers: _authHeaders(),
    body: '{}',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || data.result?.reason || `Undo failed (${response.status})`);
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

export const mergeReceiptStaging = async (id, mergeIds) => {
  const response = await fetch(`${API_ROOT}/api/receipts/staging/${id}/merge/`, {
    method: 'POST',
    headers: _authHeaders(),
    body: JSON.stringify({ merge_ids: mergeIds }),
  });
  return _handleResponse(response);
};

export const fetchReceiptReviewSettings = async () => {
  const response = await fetch(`${API_ROOT}/api/receipts/settings/`, {
    headers: _authHeaders(),
  });
  return _handleResponse(response);
};

export const updateReceiptReviewSettings = async (payload) => {
  const response = await fetch(`${API_ROOT}/api/receipts/settings/`, {
    method: 'PATCH',
    headers: _authHeaders(),
    body: JSON.stringify(payload),
  });
  return _handleResponse(response);
};
