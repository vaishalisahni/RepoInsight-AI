import * as vscode from 'vscode';
import { AuthManager } from './auth/authManager';
import { ApiClient } from './api/client';
import { ChatPanel } from './panels/chatPanel';
import { RepoTreeProvider } from './providers/repoTreeProvider';
import { IndexingManager } from './indexing/indexingManager';

let chatPanel: ChatPanel | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[RepoInsight] Extension activating…');

  const config    = vscode.workspace.getConfiguration('repoinsight');
  const baseUrl   = config.get<string>('apiBaseUrl', 'http://localhost:4000');
  const apiClient = new ApiClient(baseUrl, context);
  const authMgr   = new AuthManager(context, apiClient);
  const indexMgr  = new IndexingManager(apiClient, context);

  // ── Tree view (sidebar) ────────────────────────────────────────────────
  const treeProvider = new RepoTreeProvider(apiClient, authMgr);
  vscode.window.registerTreeDataProvider('repoinsight.repoView', treeProvider);

  // ── Commands ────────────────────────────────────────────────────────────
  context.subscriptions.push(

    vscode.commands.registerCommand('repoinsight.openPanel', () => {
      chatPanel = ChatPanel.createOrShow(context, apiClient, authMgr);
    }),

    vscode.commands.registerCommand('repoinsight.login', async () => {
      await authMgr.promptLogin();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('repoinsight.logout', async () => {
      await authMgr.logout();
      treeProvider.refresh();
      chatPanel?.dispose();
    }),

    vscode.commands.registerCommand('repoinsight.indexRepo', async () => {
      if (!authMgr.isLoggedIn()) {
        const action = await vscode.window.showErrorMessage(
          'Please log in to RepoInsight first.',
          'Login'
        );
        if (action === 'Login') await authMgr.promptLogin();
        return;
      }
      await indexMgr.indexCurrentWorkspace();
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('repoinsight.explainFile', async (uri?: vscode.Uri) => {
      const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
      if (!filePath) { vscode.window.showWarningMessage('No file selected.'); return; }
      chatPanel = ChatPanel.createOrShow(context, apiClient, authMgr);
      chatPanel.explainFile(filePath);
    }),

    vscode.commands.registerCommand('repoinsight.explainSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('Select some code first.');
        return;
      }
      const code = editor.document.getText(editor.selection);
      const file = editor.document.fileName;
      chatPanel = ChatPanel.createOrShow(context, apiClient, authMgr);
      chatPanel.explainSelection(file, code, editor.selection.start.line + 1);
    }),

    vscode.commands.registerCommand('repoinsight.analyzeImpact', async (uri?: vscode.Uri) => {
      const filePath = uri?.fsPath || vscode.window.activeTextEditor?.document.fileName;
      if (!filePath) { vscode.window.showWarningMessage('No file selected.'); return; }
      chatPanel = ChatPanel.createOrShow(context, apiClient, authMgr);
      chatPanel.analyzeImpact(filePath);
    }),

    vscode.commands.registerCommand('repoinsight.traceFlow', async () => {
      const editor = vscode.window.activeTextEditor;
      const entryPoint = editor?.document.fileName;
      if (!entryPoint) { vscode.window.showWarningMessage('Open a file first.'); return; }

      const fnName = await vscode.window.showInputBox({
        prompt: 'Function name to trace (optional)',
        placeHolder: 'e.g. handleLogin',
      });

      chatPanel = ChatPanel.createOrShow(context, apiClient, authMgr);
      chatPanel.traceFlow(entryPoint, fnName);
    })
  );

  // ── Status bar item ─────────────────────────────────────────────────────
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'repoinsight.openPanel';
  statusBar.tooltip = 'Open RepoInsight AI Chat';
  context.subscriptions.push(statusBar);

  const updateStatus = () => {
    if (authMgr.isLoggedIn()) {
      statusBar.text    = '$(hubot) RepoInsight';
      statusBar.color   = '#60a5fa';
    } else {
      statusBar.text    = '$(hubot) RepoInsight (Login)';
      statusBar.color   = '#64748b';
    }
    statusBar.show();
  };

  authMgr.onAuthChange(updateStatus);
  updateStatus();

  // ── Auto-index if configured ─────────────────────────────────────────
  if (config.get<boolean>('autoIndex') && authMgr.isLoggedIn()) {
    indexMgr.indexCurrentWorkspace().then(() => treeProvider.refresh());
  }

  console.log('[RepoInsight] Extension activated ✓');
}

export function deactivate() {}