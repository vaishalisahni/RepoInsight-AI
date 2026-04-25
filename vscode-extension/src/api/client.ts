import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface Repo {
  _id: string;
  name: string;
  status: 'pending' | 'indexing' | 'ready' | 'error';
  totalFiles?: number;
  totalChunks?: number;
  summary?: string;
  techStack?: any;
  keyFiles?: string[];
  errorMessage?: string;
  createdAt?: string;
}

export interface QueryResult {
  answer: string;
  sources: Array<{ filePath: string; startLine?: number; endLine?: number; snippet?: string }>;
  sessionId: string;
}

export class ApiClient {
  private http: AxiosInstance;
  private context: vscode.ExtensionContext;
  private baseUrl: string;

  constructor(baseUrl: string, context: vscode.ExtensionContext) {
    this.baseUrl = baseUrl;
    this.context = context;
    this.http = axios.create({
      baseURL: `${baseUrl}/api`,
      timeout: 120_000,
      withCredentials: false,
    });

    // Attach stored token on every request
    this.http.interceptors.request.use(cfg => {
      const token = this.context.globalState.get<string>('repoinsight.accessToken');
      if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
      return cfg;
    });

    // Auto-refresh on 401
    this.http.interceptors.response.use(
      r => r,
      async err => {
        const orig = err.config;
        if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
          orig._retry = true;
          try {
            const refreshToken = this.context.globalState.get<string>('repoinsight.refreshToken');
            if (!refreshToken) throw new Error('No refresh token');
            const res = await axios.post(`${this.baseUrl}/api/auth/refresh`, {}, {
              headers: { Cookie: `refresh_token=${refreshToken}` }
            });
            const newToken = res.data?.accessToken;
            if (newToken) {
              await this.context.globalState.update('repoinsight.accessToken', newToken);
              orig.headers['Authorization'] = `Bearer ${newToken}`;
              return this.http(orig);
            }
          } catch (_) {}
        }
        return Promise.reject(err);
      }
    );
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<{ user: any; accessToken?: string }> {
    const res = await this.http.post('/auth/login', { email, password });
    return res.data;
  }

  async logout(): Promise<void> {
    try { await this.http.post('/auth/logout'); } catch (_) {}
  }

  async getMe(): Promise<any> {
    const res = await this.http.get('/auth/me');
    return res.data;
  }

  // ── Repos ────────────────────────────────────────────────────────────────
  async getRepos(): Promise<Repo[]> {
    const res = await this.http.get('/ingest');
    return res.data;
  }

  async getRepoStatus(repoId: string): Promise<Repo> {
    const res = await this.http.get(`/ingest/${repoId}/status`);
    return res.data;
  }

  async ingestGithub(url: string, branch = 'main'): Promise<{ repoId: string; status: string }> {
    const res = await this.http.post('/ingest', { url, branch });
    return res.data;
  }

  async deleteRepo(repoId: string): Promise<void> {
    await this.http.delete(`/ingest/${repoId}`);
  }

  async reindexRepo(repoId: string): Promise<void> {
    await this.http.post(`/ingest/${repoId}/reindex`);
  }

  // ── AI features ──────────────────────────────────────────────────────────
  async query(repoId: string, question: string, sessionId?: string): Promise<QueryResult> {
    const res = await this.http.post('/query', { repoId, question, sessionId });
    return res.data;
  }

  async explain(repoId: string, filePath: string, selection?: { code: string; startLine: number }): Promise<any> {
    const res = await this.http.post('/explain', { repoId, filePath, selection });
    return res.data;
  }

  async trace(repoId: string, entryPoint: string, functionName?: string): Promise<any> {
    const res = await this.http.post('/trace', { repoId, entryPoint, functionName });
    return res.data;
  }

  async impact(repoId: string, filePath: string): Promise<any> {
    const res = await this.http.post('/impact', { repoId, filePath });
    return res.data;
  }

  async getGraph(repoId: string): Promise<any> {
    const res = await this.http.get(`/graph/${repoId}`);
    return res.data;
  }
}