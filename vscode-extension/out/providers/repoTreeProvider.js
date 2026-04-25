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
exports.RepoTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class RepoTreeProvider {
    constructor(api, auth) {
        this.api = api;
        this.auth = auth;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(el) {
        return el;
    }
    async getChildren(element) {
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
                    const item = new RepoItem(r.name.includes('/') ? r.name.split('/').pop() : r.name, r._id, r.status, r.status === 'ready'
                        ? vscode.TreeItemCollapsibleState.Collapsed
                        : vscode.TreeItemCollapsibleState.None);
                    item.description = r.status === 'ready'
                        ? `${(r.totalFiles || 0).toLocaleString()} files`
                        : r.status;
                    item.iconPath = iconForStatus(r.status);
                    if (r.status === 'ready') {
                        item.command = {
                            command: 'repoinsight.openPanel',
                            title: 'Open Chat',
                            arguments: [r._id],
                        };
                    }
                    return item;
                });
            }
            catch (_) {
                return [new RepoItem('Error loading repos.', '', 'error', vscode.TreeItemCollapsibleState.None)];
            }
        }
        // Children of a repo — show key files if available
        return [];
    }
}
exports.RepoTreeProvider = RepoTreeProvider;
function iconForStatus(status) {
    switch (status) {
        case 'ready': return new vscode.ThemeIcon('database', new vscode.ThemeColor('charts.green'));
        case 'indexing': return new vscode.ThemeIcon('loading~spin', new vscode.ThemeColor('charts.yellow'));
        case 'error': return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        default: return new vscode.ThemeIcon('repo');
    }
}
class RepoItem extends vscode.TreeItem {
    constructor(label, repoId, status, collapsibleState) {
        super(label, collapsibleState);
        this.repoId = repoId;
        this.status = status;
        this.contextValue = `repo_${status}`;
    }
}
//# sourceMappingURL=repoTreeProvider.js.map