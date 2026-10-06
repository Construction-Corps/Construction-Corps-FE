const API_ROOT = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ccbe.onrender.com').replace(/\/$/, '');

const _authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }
  return headers;
};

const _request = async (path, options = {}) => {
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers: _authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchAutomationsOverview = () => _request('/automations/api/overview/');

export const fetchAutomationRuns = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return _request(`/automations/api/runs/?${query}`);
};

export const fetchAutomationRun = (id) => _request(`/automations/api/runs/${id}/`);

export const setAutomationLive = (key, live) =>
  _request(`/automations/api/automations/${encodeURIComponent(key)}/live/`, {
    method: 'POST',
    body: JSON.stringify({ live }),
  });
