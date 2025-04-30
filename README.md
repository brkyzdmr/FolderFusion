# FolderFusion

Visual Studio Code extension for combining code files in a folder into a single output, optimized for LLM workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Features

- **Clipboard & File Output**: Copy merged code directly to the clipboard, or save to a new file.
- **Exclude Patterns**: Ignore `node_modules`, `.git`, or any custom glob patterns configured by you.
- **File Separators**: Optionally insert `// ==== File: path/to/file ====` headers between snippets.
- **Extension Filtering**: Pick which file types to include via a quick‑pick UI.
- **ASCII Tree**: Generate a visual ASCII directory tree of your selected folders.
- **Interactive Prompts**: Commands available in the Command Palette.

## ⚙️ Configuration

Configure via **Settings** → **Extensions** → **FolderFusion**:

| Setting                      | Type     | Default                                  | Description                                       |
| ---------------------------- | -------- | ---------------------------------------- | ------------------------------------------------- |
| `folderFusion.exclude`       | `string[]` | `['**/node_modules/**', '**/.git/**']` | Glob patterns to ignore when collecting files.    |
| `folderFusion.includeSeparator` | `boolean` | `true`                                   | Insert file‑path comments between merged snippets. |
| `folderFusion.codeFileExtensions` | `string[]` | `['.ts','.js','.cs',...]`                | File extensions considered “code” for quick merge. |

## 🛠️ Installation & Usage

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for **FolderFusion**
4. Click **Install**

### From Source

<details>
<summary>Prerequisites</summary>

- [Node.js](https://nodejs.org/) (v12+)
- npm (bundled with Node.js)
- [Visual Studio Code](https://code.visualstudio.com/)
- [vsce](https://github.com/microsoft/vscode-vsce) (extension packager):
  ```bash
  npm install -g @vscode/vsce
  ```
</details>

1. **Clone the repo**
   ```bash
   git clone https://github.com/brkyzdmr/folder-fusion.git
   cd folder-fusion
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Compile & Package**
   ```bash
   npm run compile
   vsce package
   ```
4. **Install VSIX**
   - **Via UI**: Extensions view → `...` → **Install from VSIX…** → select `.vsix` file
   - **Via CLI** (if `code` is in PATH):
     ```bash
     code --install-extension folder-fusion-*.vsix
     ```
5. **Restart VS Code**

## 📋 Commands

- **Combine to Clipboard**: Right‑click on files/folders → **FolderFusion: Combine to Clipboard**
- **Combine to File**: Right‑click → **FolderFusion: Combine to File** (choose save location)
- **Generate Tree**: Right‑click → **FolderFusion: Generate Folder Structure**

## 💡 Tips

- Select multiple folders or files together for bulk operations.
- Use exclude globs to skip large directories like `dist/` or `build/`.
- Paste merged snippets straight into ChatGPT or other tools for context‑aware analysis.

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.