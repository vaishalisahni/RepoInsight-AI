import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL:       `${BASE_URL}/api`,
  timeout:       180000,
  withCredentials: true, // send cookies on every request
});

// ── Axios response interceptor: auto-refresh on 401 TOKEN_EXPIRED ─────────
let isRefreshing = false;
let queue = [];

function processQueue(error) {
  queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
  queue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const code     = err.response?.data?.code;

    if (err.response?.status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original)).catch(Promise.reject);
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        // Refresh failed → redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const register  = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then(r => r.data);

export const login     = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

export const logout    = () =>
  api.post('/auth/logout').then(r => r.data);

export const getMe     = () =>
  api.get('/auth/me').then(r => r.data);

export const updateProfile = (data) =>
  api.patch('/auth/profile', data).then(r => r.data);

export const saveGithubToken = (token) =>
  api.patch('/auth/github-token', { token }).then(r => r.data);

export const removeGithubToken = () =>
  api.patch('/auth/github-token', { token: null }).then(r => r.data);

export const getGithubTokenStatus = () =>
  api.get('/auth/github-token/status').then(r => r.data);

// ── Repo lifecycle ────────────────────────────────────────────────────────
export const ingestGithub  = (url, branch = 'main') =>
  api.post('/ingest', { url, branch }).then(r => r.data);

export const getRepos      = () =>
  api.get('/ingest').then(r => r.data);

export const getRepoStatus = (id) =>
  api.get(`/ingest/${id}/status`).then(r => r.data);

export const deleteRepo    = (id) =>
  api.delete(`/ingest/${id}`).then(r => r.data);

export const reindexRepo   = (id) =>
  api.post(`/ingest/${id}/reindex`).then(r => r.data);

// ── AI features ───────────────────────────────────────────────────────────
export const queryRepo     = (repoId, question, sessionId) =>
  api.post('/query', { repoId, question, sessionId }).then(r => r.data);

export const explainFile   = (repoId, filePath, selection) =>
  api.post('/explain', { repoId, filePath, selection }).then(r => r.data);

export const traceFlow     = (repoId, entryPoint, functionName) =>
  api.post('/trace', { repoId, entryPoint, functionName }).then(r => r.data);

export const analyzeImpact = (repoId, filePath) =>
  api.post('/impact', { repoId, filePath }).then(r => r.data);

export const getGraph      = (repoId) =>
  api.get(`/graph/${repoId}`).then(r => r.data);

export const getSessions   = (repoId) =>
  api.get(`/query/sessions/${repoId}`).then(r => r.data);

export default api;