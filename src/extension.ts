/*
 * FolderFusion VS Code Extension
 *
 * Provides commands to:
 *   - Copy merged file contents by extension
 *   - Copy code files contents based on configured extensions
 *   - Generate and copy an ASCII tree of folder structure
 *
 * Author: Berkay Ezdemir
 * License: MIT
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { extractExtensions, relativePath } from './utils';

// Single output channel for logging and debugging
let outputChannel: vscode.OutputChannel;

/**
 * Activate extension: create output channel and register all commands.
 */
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('FolderFusion');
  outputChannel.appendLine('FolderFusion extension activated.');

  /** Helper to register a command with unified error handling */
  const register = (
    command: string,
    handler: (uris: vscode.Uri[]) => Promise<void>
  ) => {
    const disposable = vscode.commands.registerCommand(
      command,
      async (uri?: vscode.Uri, allUris?: vscode.Uri[] | vscode.Uri) => {
        // Normalize selection from Explorer or multi-select
        const uris = normalizeUris(uri, allUris);
        if (!uris.length) {
          vscode.window.showWarningMessage('FolderFusion: No items selected.');
          return;
        }
        try {
          await handler(uris);
        } catch (err: any) {
          // Log full stack and show concise error to user
          outputChannel.appendLine(`Error in ${command}: ${err.stack || err}`);
          vscode.window.showErrorMessage(`FolderFusion error: ${err.message}`);
        }
      }
    );
    context.subscriptions.push(disposable);
  };

  // Register all extension commands
  register('folderFusion.getFolderContent', handleFolderContent);
  register('folderFusion.getCodeFilesContent', handleCodeFilesContent);
  register('folderFusion.getFolderStructure', handleFolderStructure);
}

/**
 * Deactivate extension: dispose output channel.
 */
export function deactivate() {
  outputChannel?.dispose();
}

/**
 * Normalize URI input from command call.
 */
function normalizeUris(
  uri?: vscode.Uri,
  selected?: vscode.Uri[] | vscode.Uri
): vscode.Uri[] {
  if (Array.isArray(selected) && selected.length) {
    return selected;
  }
  if (selected instanceof vscode.Uri) {
    return [selected];
  }
  if (uri instanceof vscode.Uri) {
    return [uri];
  }
  return [];
}

/**
 * Handler: merge all files of chosen extensions and copy to clipboard.
 */
async function handleFolderContent(uris: vscode.Uri[]): Promise<void> {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'FolderFusion: Processing folder content...' },
    async () => {
      const { files } = await collectFiles(uris);
      if (!files.length) {
        vscode.window.showWarningMessage('No files found in selection.');
        return;
      }

      // Prompt user to select extensions to include
      const extensions = extractExtensions(files);
      const picks = await vscode.window.showQuickPick(
        extensions.map(ext => ({ label: ext || '<no ext>', picked: true })),
        { canPickMany: true, placeHolder: `Select types (from ${files.length} files)` }
      );
      if (!picks?.length) {
        vscode.window.showInformationMessage('Operation cancelled.');
        return;
      }

      // Filter files by chosen extensions
      const chosen = picks.map(p => (p.label === '<no ext>' ? '' : p.label));
      const filtered = files.filter(f => chosen.includes(path.extname(f)));
      if (!filtered.length) {
        vscode.window.showWarningMessage('No files matched your selection.');
        return;
      }

      // Merge and copy
      const merged = mergeFiles(filtered);
      await vscode.env.clipboard.writeText(merged);
      vscode.window.showInformationMessage(`Copied ${filtered.length} file(s) to clipboard.`);
    }
  );
}

/**
 * Handler: merge configured code file extensions and copy to clipboard.
 */
async function handleCodeFilesContent(uris: vscode.Uri[]): Promise<void> {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'FolderFusion: Processing code files...' },
    async () => {
      const cfg = vscode.workspace.getConfiguration('folderFusion');
      const codeExts: string[] = cfg.get('codeFileExtensions') || [];
      if (!codeExts.length) {
        vscode.window.showWarningMessage('No code extensions defined in settings.');
        return;
      }

      const { files } = await collectFiles(uris);
      const codeFiles = files.filter(f => codeExts.includes(path.extname(f).toLowerCase()));
      if (!codeFiles.length) {
        vscode.window.showWarningMessage('No code files found.');
        return;
      }

      const merged = mergeFiles(codeFiles);
      await vscode.env.clipboard.writeText(merged);
      vscode.window.showInformationMessage(`Copied ${codeFiles.length} code file(s).`);
    }
  );
}

/**
 * Handler: generate ASCII tree structure and copy to clipboard.
 */
async function handleFolderStructure(uris: vscode.Uri[]): Promise<void> {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'FolderFusion: Generating folder structure...' },
    async () => {
      const { roots } = await collectFiles(uris);
      let tree = '';

      if (roots.length === 1) {
        // Single root: include header then children
        const root = roots[0];
        tree = `${path.basename(root)}/
${generateTree(root, '')}`;
      } else {
        // Multiple roots: each as top-level branch
        tree = roots
          .map((root, idx) => {
            const isLast = idx === roots.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            const indent = isLast ? '    ' : '│   ';
            return `${prefix}${path.basename(root)}/
` + generateTree(root, indent);
          })
          .join('');
      }

      await vscode.env.clipboard.writeText(tree.trim());
      vscode.window.showInformationMessage('Folder structure copied to clipboard.');
    }
  );
}

/**
 * Recursively collect file paths and root directories from URIs.
 * Applies workspace exclude patterns.
 */
async function collectFiles(
  uris: vscode.Uri[]
): Promise<{ files: string[]; roots: string[] }> {
  const cfg = vscode.workspace.getConfiguration('folderFusion');
  const excludes: string[] = cfg.get('exclude') || [];
  const excludeGlob = excludes.length ? `{${excludes.join(',')}}` : undefined;

  const fileSet = new Set<string>();
  const rootSet = new Set<string>();

  for (const u of uris) {
    // Determine root: folder or file's parent
    const stat = await fs.promises.stat(u.fsPath);
    const root = stat.isDirectory() ? u.fsPath : path.dirname(u.fsPath);
    rootSet.add(root);

    // Find all files under root
    const pattern = new vscode.RelativePattern(root, '**/*');
    const matches = await vscode.workspace.findFiles(pattern, excludeGlob);
    matches.forEach(m => fileSet.add(m.fsPath));
  }

  return { files: Array.from(fileSet), roots: Array.from(rootSet) };
}

/**
 * Merge file contents, optionally inserting separators showing file paths.
 */
function mergeFiles(paths: string[]): string {
  const cfg = vscode.workspace.getConfiguration('folderFusion');
  const includeSep = cfg.get<boolean>('includeSeparator') ?? true;
  let output = '';

  for (const file of paths) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (includeSep) {
        output += `// ==== File: ${relativePath(file)} ====\n\n`;
      }
      output += content.trim() + '\n\n';
    } catch (err: any) {
      // Gracefully note files that failed to read
      output += `// Error reading ${relativePath(file)}: ${err.message}\n\n`;
    }
  }
  return output.trim();
}

/**
 * Recursively generate ASCII tree lines for directory contents.
 * Uses pointers and indentation to show hierarchy.
 */
function generateTree(dir: string, indent: string): string {
  let out = '';
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
      // Directories first, then alphabetical
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch {
    return out; // Permission error or empty
  }

  entries.forEach((ent, idx) => {
    const isLast = idx === entries.length - 1;
    const pointer = isLast ? '└── ' : '├── ';
    out += `${indent}${pointer}${ent.name}${ent.isDirectory() ? '/' : ''}\n`;
    if (ent.isDirectory()) {
      // Recurse into subdirectory
      const nextIndent = indent + (isLast ? '    ' : '│   ');
      out += generateTree(path.join(dir, ent.name), nextIndent);
    }
  });
  return out;
}