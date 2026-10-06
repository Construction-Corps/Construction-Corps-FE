const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ccbe.onrender.com').replace(/\/$/, '');

const _authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }
  return headers;
};

const _get = async (path) => {
  const response = await fetch(`${API_ROOT}${path}`, { headers: _authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchAutomationsOverview = () => _get('/automations/api/overview/');

export const fetchAutomationRuns = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return _get(`/automations/api/runs/?${query}`);
};

export const fetchAutomationRun = (id) => _get(`/automations/api/runs/${id}/`);
