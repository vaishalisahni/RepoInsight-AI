import * as vscode from 'vscode';
import { ApiClient } from '../api/client';

type AuthChangeHandler = () => void;

export class AuthManager {
  private context: vscode.ExtensionContext;
  private apiClient: ApiClient;
  private _handlers: AuthChangeHandler[] = [];
  private _user: any = null;

  constructor(context: vscode.ExtensionContext, apiClient: ApiClient) {
    this.context   = context;
    this.apiClient = apiClient;

    // Restore user from global state
    this._user = context.globalState.get('repoinsight.user') ?? null;
  }

  onAuthChange(handler: AuthChangeHandler) {
    this._handlers.push(handler);
  }

  private _notify() {
    this._handlers.forEach(h => h());
  }

  isLoggedIn(): boolean {
    return !!this._user && !!this.context.globalState.get('repoinsight.accessToken');
  }

  getUser(): any {
    return this._user;
  }

  async promptLogin(): Promise<boolean> {
    const email = await vscode.window.showInputBox({
      prompt: 'RepoInsight email address',
      placeHolder: 'you@example.com',
      validateInput: v => v.includes('@') ? undefined : 'Enter a valid email',
    });
    if (!email) return false;

    const password = await vscode.window.showInputBox({
      prompt: 'RepoInsight password',
      password: true,
      placeHolder: '••••••••',
    });
    if (!password) return false;

    return vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Signing in to RepoInsight…' },
      async () => {
        try {
          const data = await this.apiClient.login(email, password);
          this._user = data.user;

          // The backend sets cookies but in VS Code we need the token from response
          // Backend sends access_token in cookie — we need to modify backend to also
          // return it in body for API clients. For now store what we have.
          const token = (data as any).accessToken || (data as any).token;
          if (token) {
            await this.context.globalState.update('repoinsight.accessToken', token);
          }
          await this.context.globalState.update('repoinsight.user', this._user);

          this._notify();
          vscode.window.showInformationMessage(`✓ Signed in as ${this._user?.name || email}`);
          return true;
        } catch (err: any) {
          const msg = err.response?.data?.error || err.message;
          vscode.window.showErrorMessage(`Login failed: ${msg}`);
          return false;
        }
      }
    );
  }

  async logout(): Promise<void> {
    try { await this.apiClient.logout(); } catch (_) {}
    this._user = null;
    await this.context.globalState.update('repoinsight.accessToken', undefined);
    await this.context.globalState.update('repoinsight.user', undefined);
    await this.context.globalState.update('repoinsight.activeRepoId', undefined);
    this._notify();
    vscode.window.showInformationMessage('Signed out of RepoInsight.');
  }

  getActiveRepoId(): string | undefined {
    return this.context.globalState.get<string>('repoinsight.activeRepoId');
  }

  async setActiveRepoId(id: string): Promise<void> {
    await this.context.globalState.update('repoinsight.activeRepoId', id);
  }
}