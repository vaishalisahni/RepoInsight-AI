"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ApiClient {
    constructor(baseUrl, context) {
        this.baseUrl = baseUrl;
        this.context = context;
        this.http = axios_1.default.create({
            baseURL: `${baseUrl}/api`,
            timeout: 120000,
            withCredentials: false,
        });
        // Attach stored token on every request
        this.http.interceptors.request.use(cfg => {
            const token = this.context.globalState.get('repoinsight.accessToken');
            if (token)
                cfg.headers['Authorization'] = `Bearer ${token}`;
            return cfg;
        });
        // Auto-refresh on 401
        this.http.interceptors.response.use(r => r, async (err) => {
            const orig = err.config;
            if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
                orig._retry = true;
                try {
                    const refreshToken = this.context.globalState.get('repoinsight.refreshToken');
                    if (!refreshToken)
                        throw new Error('No refresh token');
                    const res = await axios_1.default.post(`${this.baseUrl}/api/auth/refresh`, {}, {
                        headers: { Cookie: `refresh_token=${refreshToken}` }
                    });
                    const newToken = res.data?.accessToken;
                    if (newToken) {
                        await this.context.globalState.update('repoinsight.accessToken', newToken);
                        orig.headers['Authorization'] = `Bearer ${newToken}`;
                        return this.http(orig);
                    }
                }
                catch (_) { }
            }
            return Promise.reject(err);
        });
    }
    // ── Auth ────────────────────────────────────────────────────────────────
    async login(email, password) {
        const res = await this.http.post('/auth/login', { email, password });
        return res.data;
    }
    async logout() {
        try {
            await this.http.post('/auth/logout');
        }
        catch (_) { }
    }
    async getMe() {
        const res = await this.http.get('/auth/me');
        return res.data;
    }
    // ── Repos ────────────────────────────────────────────────────────────────
    async getRepos() {
        const res = await this.http.get('/ingest');
        return res.data;
    }
    async getRepoStatus(repoId) {
        const res = await this.http.get(`/ingest/${repoId}/status`);
        return res.data;
    }
    async ingestGithub(url, branch = 'main') {
        const res = await this.http.post('/ingest', { url, branch });
        return res.data;
    }
    async deleteRepo(repoId) {
        await this.http.delete(`/ingest/${repoId}`);
    }
    async reindexRepo(repoId) {
        await this.http.post(`/ingest/${repoId}/reindex`);
    }
    // ── AI features ──────────────────────────────────────────────────────────
    async query(repoId, question, sessionId) {
        const res = await this.http.post('/query', { repoId, question, sessionId });
        return res.data;
    }
    async explain(repoId, filePath, selection) {
        const res = await this.http.post('/explain', { repoId, filePath, selection });
        return res.data;
    }
    async trace(repoId, entryPoint, functionName) {
        const res = await this.http.post('/trace', { repoId, entryPoint, functionName });
        return res.data;
    }
    async impact(repoId, filePath) {
        const res = await this.http.post('/impact', { repoId, filePath });
        return res.data;
    }
    async getGraph(repoId) {
        const res = await this.http.get(`/graph/${repoId}`);
        return res.data;
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=client.js.map