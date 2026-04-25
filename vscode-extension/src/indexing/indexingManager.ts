import * as vscode from 'vscode';
import * as path from 'path';
import { ApiClient } from '../api/client';

export class IndexingManager {
  constructor(
    private api: ApiClient,
    private context: vscode.ExtensionContext
  ) {}

  async indexCurrentWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      vscode.window.showWarningMessage('Open a workspace folder first.');
      return;
    }

    // Check if it's a git repo — ask for GitHub URL
    const choices = ['From GitHub URL', 'Cancel'];
    const pick    = await vscode.window.showQuickPick(choices, {
      placeHolder: 'How would you like to index this repository?',
    });
    if (!pick || pick === 'Cancel') return;

    const url = await vscode.window.showInputBox({
      prompt:      'GitHub repository URL',
      placeHolder: 'https://github.com/owner/repo',
      validateInput: v => v.startsWith('https://github.com') ? undefined : 'Must be a GitHub URL',
    });
    if (!url) return;

    const branch = await vscode.window.showInputBox({
      prompt:       'Branch (default: main)',
      placeHolder:  'main',
      value:        'main',
    });

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title:    'RepoInsight: Indexing repository…',
        cancellable: false,
      },
      async (progress) => {
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
            const pct    = Math.min(30 + attempts * 1, 90);
            progress.report({
              message:  `${status.status} · ${(status.totalChunks || 0).toLocaleString()} chunks`,
              increment: pct,
            });

            if (status.status === 'ready') {
              await this.context.globalState.update('repoinsight.activeRepoId', repoId);
              vscode.window.showInformationMessage(
                `✓ Indexed! ${status.totalFiles} files, ${status.totalChunks} chunks.`,
                'Open Chat'
              ).then(action => {
                if (action === 'Open Chat') vscode.commands.executeCommand('repoinsight.openPanel');
              });
              return;
            }

            if (status.status === 'error') {
              vscode.window.showErrorMessage(`Indexing failed: ${status.errorMessage}`);
              return;
            }
          }

          vscode.window.showWarningMessage('Indexing is taking longer than expected. Check the dashboard.');
        } catch (err: any) {
          const msg = err.response?.data?.error || err.message;
          vscode.window.showErrorMessage(`Indexing failed: ${msg}`);
        }
      }
    );
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}