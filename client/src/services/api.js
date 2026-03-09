import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const rootBaseUrl = /^https?:\/\//.test(apiBaseUrl) ? apiBaseUrl.replace(/\/api\/v1\/?$/, '') : '';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000
});

export async function checkHealth() {
  const target = rootBaseUrl ? `${rootBaseUrl}/health` : '/health';
  const response = await axios.get(target, { timeout: 10000 });
  return response.data;
}

export async function parseResume(file) {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.post('/resume/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
}

export async function syncGithub(username, token) {
  const response = await api.get(`/github/sync/${encodeURIComponent(username)}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined
  });
  return response.data;
}