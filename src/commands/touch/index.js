import { FileOperations } from '../../utils/operations/files/index.js';

const touchCommand = {
  name: 'touch',
  description: 'Create new files',
  source: 'builtin',
  handler: (args) => {
    if (args.length === 0) {
      return 'Usage: /touch <file1> [file2 ...]';
    }

    const createdFiles = [];
    const failedFiles = [];

    for (const filePath of args) {
      try {
        const result = FileOperations.touchFile(filePath);
        
        if (result.created) {
          createdFiles.push(result.path);
        } else {
          failedFiles.push(`${filePath} (already exists)`);
        }
      } catch (error) {
        failedFiles.push(`${filePath} (${error.message})`);
      }
    }

    let result = '';
    if (createdFiles.length > 0) {
      result += `Created files:\n${createdFiles.map(f => `  ${f}`).join('\n')}\n`;
    }
    if (failedFiles.length > 0) {
      result += `Failed to create:\n${failedFiles.map(f => `  ${f}`).join('\n')}\n`;
    }
    return result || 'No files created';
  }
};

export default touchCommand;
