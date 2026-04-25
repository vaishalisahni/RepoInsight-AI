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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const authManager_1 = require("./auth/authManager");
const client_1 = require("./api/client");
const chatPanel_1 = require("./panels/chatPanel");
const repoTreeProvider_1 = require("./providers/repoTreeProvider");
const indexingManager_1 = require("./indexing/indexingManager");
let chatPanel;
async function activate(context) {
    console.log('[RepoInsight] Extension activating…');
    const config = vscode.workspace.getConfiguration('repoinsight');
    const baseUrl = config.get('apiBaseUrl', 'http://localhost:4000');
    const apiClient = new client_1.ApiClient(baseUrl, context);
    const authMgr = new authManager_1.AuthManager(context, apiClient);
    const indexMgr = new indexingManager_1.IndexingManager(apiClient, context);
    // ── Tree view (sidebar) ────────────────────────────────────────────────
    const treeProvider = new repoTreeProvider_1.RepoTreeProvider(apiClient, authMgr);
    vscode.window.registerTreeDataProvider('repoinsight.repoView', treeProvider);
    // ── Commands ────────────────────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('repoinsight.openPanel', () => {
        chatPanel = chatPanel_1.ChatPanel.createOrShow(context, apiClient, authMgr);
    }), vscode.commands.registerCommand('repoinsight.login', async () => {
        await authMgr.promptLogin();
        treeProvider.refresh();
    }), vscode.commands.registerCommand('repoinsight.logout', async () => {
        await authMgr.logout();
        treeProvider.refresh();
        chatPanel?.dispose();
    }), vscode.commands.registerCommand('repoinsight.indexRepo', async () => {
        if (!authMgr.isLoggedIn()) {
            const action = await vscode.window.showErrorMessage('Please log in to RepoInsight first.', 'Login');
            if (action === 'Login')
                await authMgr.promptLogin();
            return;
        }
        await indexMgr.indexCurrentWorkspace();
        treeProvider.refresh();
    }), vscode.commands.registerCommand('repoinsight.explainFile', async (uri) => {
        const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
        if (!filePath) {
            vscode.window.showWarningMessage('No file selected.');
            return;
        }
        chatPanel = chatPanel_1.ChatPanel.createOrShow(context, apiClient, authMgr);
        chatPanel.explainFile(filePath);
    }), vscode.commands.registerCommand('repoinsight.explainSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showWarningMessage('Select some code first.');
            return;
        }
        const code = editor.document.getText(editor.selection);
        const file = editor.document.fileName;
        chatPanel = chatPanel_1.ChatPanel.createOrShow(context, apiClient, authMgr);
        chatPanel.explainSelection(file, code, editor.selection.start.line + 1);
    }), vscode.commands.registerCommand('repoinsight.analyzeImpact', async (uri) => {
        const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
        if (!filePath) {
            vscode.window.showWarningMessage('No file selected.');
            return;
        }
        chatPanel = chatPanel_1.ChatPanel.createOrShow(context, apiClient, authMgr);
        chatPanel.analyzeImpact(filePath);
    }), vscode.commands.registerCommand('repoinsight.traceFlow', async () => {
        const editor = vscode.window.activeTextEditor;
        const entryPoint = editor?.document.fileName;
        if (!entryPoint) {
            vscode.window.showWarningMessage('Open a file first.');
            return;
        }
        const fnName = await vscode.window.showInputBox({
            prompt: 'Function name to trace (optional)',
            placeHolder: 'e.g. handleLogin',
        });
        chatPanel = chatPanel_1.ChatPanel.createOrShow(context, apiClient, authMgr);
        chatPanel.traceFlow(entryPoint, fnName);
    }));
    // ── Status bar item ─────────────────────────────────────────────────────
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.command = 'repoinsight.openPanel';
    statusBar.tooltip = 'Open RepoInsight AI Chat';
    context.subscriptions.push(statusBar);
    const updateStatus = () => {
        if (authMgr.isLoggedIn()) {
            statusBar.text = '$(hubot) RepoInsight';
            statusBar.color = '#60a5fa';
        }
        else {
            statusBar.text = '$(hubot) RepoInsight (Login)';
            statusBar.color = '#64748b';
        }
        statusBar.show();
    };
    authMgr.onAuthChange(updateStatus);
    updateStatus();
    // ── Auto-index if configured ─────────────────────────────────────────
    if (config.get('autoIndex') && authMgr.isLoggedIn()) {
        indexMgr.indexCurrentWorkspace().then(() => treeProvider.refresh());
    }
    console.log('[RepoInsight] Extension activated ✓');
}
function deactivate() { }
//# sourceMappingURL=extension.js.map