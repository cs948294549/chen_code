const fs = require('fs');
const path = require('path');

const writeCommand = {
  name: 'write',
  description: 'Write content to files',
  source: 'builtin',
  handler: (args) => {
    if (args.length < 2) {
      return 'Usage: /write <file> <content> [content ...]';
    }

    const filePath = args[0];
    const content = args.slice(1).join(' ');

    try {
      // 解析文件路径
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      
      // 确保目录存在
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(absolutePath, content, 'utf8');
      
      return `Wrote to file: ${absolutePath}`;
    } catch (error) {
      return `Failed to write file: ${error.message}`;
    }
  }
};

module.exports = writeCommand;
