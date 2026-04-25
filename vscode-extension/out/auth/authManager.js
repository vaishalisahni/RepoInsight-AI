"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const vscode = __importStar(require("vscode"));
class AuthManager {
    constructor(context, apiClient) {
        this._handlers = [];
        this._user = null;
        this.context = context;
        this.apiClient = apiClient;
        // Restore user from global state
        this._user = context.globalState.get('repoinsight.user') ?? null;
    }
    onAuthChange(handler) {
        this._handlers.push(handler);
    }
    _notify() {
        this._handlers.forEach(h => h());
    }
    isLoggedIn() {
        return !!this._user && !!this.context.globalState.get('repoinsight.accessToken');
    }
    getUser() {
        return this._user;
    }
    async promptLogin() {
        const email = await vscode.window.showInputBox({
            prompt: 'RepoInsight email address',
            placeHolder: 'you@example.com',
            validateInput: v => v.includes('@') ? undefined : 'Enter a valid email',
        });
        if (!email)
            return false;
        const password = await vscode.window.showInputBox({
            prompt: 'RepoInsight password',
            password: true,
            placeHolder: '••••••••',
        });
        if (!password)
            return false;
        return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Signing in to RepoInsight…' }, async () => {
            try {
                const data = await this.apiClient.login(email, password);
                this._user = data.user;
                // The backend sets cookies but in VS Code we need the token from response
                // Backend sends access_token in cookie — we need to modify backend to also
                // return it in body for API clients. For now store what we have.
                const token = data.accessToken || data.token;
                if (token) {
                    await this.context.globalState.update('repoinsight.accessToken', token);
                }
                await this.context.globalState.update('repoinsight.user', this._user);
                this._notify();
                vscode.window.showInformationMessage(`✓ Signed in as ${this._user?.name || email}`);
                return true;
            }
            catch (err) {
                const msg = err.response?.data?.error || err.message;
                vscode.window.showErrorMessage(`Login failed: ${msg}`);
                return false;
            }
        });
    }
    async logout() {
        try {
            await this.apiClient.logout();
        }
        catch (_) { }
        this._user = null;
        await this.context.globalState.update('repoinsight.accessToken', undefined);
        await this.context.globalState.update('repoinsight.user', undefined);
        await this.context.globalState.update('repoinsight.activeRepoId', undefined);
        this._notify();
        vscode.window.showInformationMessage('Signed out of RepoInsight.');
    }
    getActiveRepoId() {
        return this.context.globalState.get('repoinsight.activeRepoId');
    }
    async setActiveRepoId(id) {
        await this.context.globalState.update('repoinsight.activeRepoId', id);
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=authManager.js.map