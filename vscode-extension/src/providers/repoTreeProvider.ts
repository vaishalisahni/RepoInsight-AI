import * as vscode from 'vscode';
import { ApiClient, Repo } from '../api/client';
import { AuthManager } from '../auth/authManager';

export class RepoTreeProvider implements vscode.TreeDataProvider<RepoItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RepoItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private api: ApiClient,
    private auth: AuthManager
  ) {}

  refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(el: RepoItem): vscode.TreeItem {
    return el;
  }

  async getChildren(element?: RepoItem): Promise<RepoItem[]> {
    if (!this.auth.isLoggedIn()) {
      return [new RepoItem('Login to RepoInsight', '', 'login', vscode.TreeItemCollapsibleState.None)];
    }

    if (!element) {
      // Root — list repos
      try {
        const repos = await this.api.getRepos();
        if (repos.length === 0) {
          return [new RepoItem('No repos indexed yet.', '', 'empty', vscode.TreeItemCollapsibleState.None)];
        }
        return repos.map(r => {
          const item = new RepoItem(
            r.name.includes('/') ? r.name.split('/').pop()! : r.name,
            r._id,
            r.status,
            r.status === 'ready'
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.None
          );
          item.description = r.status === 'ready'
            ? `${(r.totalFiles || 0).toLocaleString()} files`
            : r.status;
          item.iconPath = iconForStatus(r.status);
          if (r.status === 'ready') {
            item.command = {
              command:   'repoinsight.openPanel',
              title:     'Open Chat',
              arguments: [r._id],
            };
          }
          return item;
        });
      } catch (_) {
        return [new RepoItem('Error loading repos.', '', 'error', vscode.TreeItemCollapsibleState.None)];
      }
    }

    // Children of a repo — show key files if available
    return [];
  }
}

function iconForStatus(status: string): vscode.ThemeIcon {
  switch (status) {
    case 'ready':    return new vscode.ThemeIcon('database', new vscode.ThemeColor('charts.green'));
    case 'indexing': return new vscode.ThemeIcon('loading~spin', new vscode.ThemeColor('charts.yellow'));
    case 'error':    return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
    default:         return new vscode.ThemeIcon('repo');
  }
}

class RepoItem extends vscode.TreeItem {
  constructor(
    label: string,
    public repoId: string,
    public status: string,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.contextValue = `repo_${status}`;
  }
}