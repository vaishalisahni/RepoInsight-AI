import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 180000 });

export const ingestGithub   = (url, branch = 'main') => api.post('/ingest', { url, branch }).then(r => r.data);
export const getRepos       = () => api.get('/ingest').then(r => r.data);
export const getRepoStatus  = (id) => api.get(`/ingest/${id}/status`).then(r => r.data);
export const deleteRepo     = (id) => api.delete(`/ingest/${id}`).then(r => r.data);
export const queryRepo      = (repoId, question, sessionId) => api.post('/query', { repoId, question, sessionId }).then(r => r.data);
export const explainFile    = (repoId, filePath, selection) => api.post('/explain', { repoId, filePath, selection }).then(r => r.data);
export const traceFlow      = (repoId, entryPoint, functionName) => api.post('/trace', { repoId, entryPoint, functionName }).then(r => r.data);
export const getGraph       = (repoId) => api.get(`/graph/${repoId}`).then(r => r.data);
export const analyzeImpact  = (repoId, filePath) => api.post('/impact', { repoId, filePath }).then(r => r.data);
export const getSessions    = (repoId) => api.get(`/query/sessions/${repoId}`).then(r => r.data);