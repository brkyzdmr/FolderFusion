/*
 * utils.ts - Utility helpers for FolderFusion VS Code Extension
 *
 * Provides:
 *   - extractExtensions: get a sorted list of unique file extensions
 *   - relativePath: convert absolute file paths to workspace-relative paths
 *
 * Author: Berkay Ezdemir
 * License: MIT
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Extract unique file extensions (including leading dot) from a list of file paths.
 *
 * @param files Array of absolute file paths to process
 * @returns Sorted array of unique lowercase extensions (e.g. ['.ts', '.js'])
 */
export function extractExtensions(files: string[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    // Use path.extname to get extension ('.ext') and normalize to lowercase
    set.add(path.extname(f).toLowerCase());
  }
  // Convert Set to array and sort for consistent ordering
  return Array.from(set).sort();
}

/**
 * Return a workspace-relative path if the file is inside an open workspace folder,
 * otherwise return just the basename (filename.ext).
 *
 * @param absPath Absolute filesystem path of the file
 * @returns Relative path from workspace root, or basename if outside workspace
 */
export function relativePath(absPath: string): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length) {
    for (const ws of folders) {
      // If the file path starts with the workspace folder path, compute relative
      if (absPath.startsWith(ws.uri.fsPath + path.sep)) {
        return path.relative(ws.uri.fsPath, absPath);
      }
    }
  }

  // Fallback: return only the filename
  return path.basename(absPath);
}
