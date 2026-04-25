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
exports.IndexingManager = void 0;
const vscode = __importStar(require("vscode"));
class IndexingManager {
    constructor(api, context) {
        this.api = api;
        this.context = context;
    }
    async indexCurrentWorkspace() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders?.length) {
            vscode.window.showWarningMessage('Open a workspace folder first.');
            return;
        }
        // Check if it's a git repo — ask for GitHub URL
        const choices = ['From GitHub URL', 'Cancel'];
        const pick = await vscode.window.showQuickPick(choices, {
            placeHolder: 'How would you like to index this repository?',
        });
        if (!pick || pick === 'Cancel')
            return;
        const url = await vscode.window.showInputBox({
            prompt: 'GitHub repository URL',
            placeHolder: 'https://github.com/owner/repo',
            validateInput: v => v.startsWith('https://github.com') ? undefined : 'Must be a GitHub URL',
        });
        if (!url)
            return;
        const branch = await vscode.window.showInputBox({
            prompt: 'Branch (default: main)',
            placeHolder: 'main',
            value: 'main',
        });
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'RepoInsight: Indexing repository…',
            cancellable: false,
        }, async (progress) => {
            try {
                progress.report({ message: 'Cloning repository…', increment: 10 });
                const { repoId } = await this.api.ingestGithub(url, branch || 'main');
                progress.report({ message: 'Indexing files…', increment: 30 });
                // Poll until ready
                let attempts = 0;
                while (attempts < 60) {
                    await sleep(3000);
                    attempts++;
                    const status = await this.api.getRepoStatus(repoId);
                    const pct = Math.min(30 + attempts * 1, 90);
                    progress.report({
                        message: `${status.status} · ${(status.totalChunks || 0).toLocaleString()} chunks`,
                        increment: pct,
                    });
                    if (status.status === 'ready') {
                        await this.context.globalState.update('repoinsight.activeRepoId', repoId);
                        vscode.window.showInformationMessage(`✓ Indexed! ${status.totalFiles} files, ${status.totalChunks} chunks.`, 'Open Chat').then(action => {
                            if (action === 'Open Chat')
                                vscode.commands.executeCommand('repoinsight.openPanel');
                        });
                        return;
                    }
                    if (status.status === 'error') {
                        vscode.window.showErrorMessage(`Indexing failed: ${status.errorMessage}`);
                        return;
                    }
                }
                vscode.window.showWarningMessage('Indexing is taking longer than expected. Check the dashboard.');
            }
            catch (err) {
                const msg = err.response?.data?.error || err.message;
                vscode.window.showErrorMessage(`Indexing failed: ${msg}`);
            }
        });
    }
}
exports.IndexingManager = IndexingManager;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=indexingManager.js.map