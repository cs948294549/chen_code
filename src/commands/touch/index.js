const fs = require('fs');
const path = require('path');

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
        // 解析文件路径
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        
        // 确保目录存在
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // 创建文件
        if (!fs.existsSync(absolutePath)) {
          fs.writeFileSync(absolutePath, '', 'utf8');
          createdFiles.push(absolutePath);
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

module.exports = touchCommand;
