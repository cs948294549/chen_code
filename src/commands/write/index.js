import fs from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger.js';

// 创建日志记录器
const logger = createLogger('write');

const writeCommand = {
  name: 'write',
  description: 'Write content to files (default: append, use --overwrite to overwrite)',
  source: 'builtin',
  handler: (args) => {
    logger.debug(`Called with args: ${JSON.stringify(args)}`);
    if (args.length < 2) {
      return 'Usage: /write <file> <content> [content ...] [--overwrite]';
    }

    // 检查是否有 --overwrite 选项
    const overwrite = args.includes('--overwrite');
    // 移除 --overwrite 选项
    const filteredArgs = args.filter(arg => arg !== '--overwrite');

    const filePath = filteredArgs[0];
    let content = filteredArgs.slice(1).join(' ');
    
    // 替换时间占位符
    const now = new Date();
    const timestamp = now.toISOString();
    const datetime = now.toLocaleString();
    
    content = content.replace(/{timestamp}/g, timestamp);
    content = content.replace(/{datetime}/g, datetime);

    logger.info(`Writing to ${filePath}: ${content}`);

    try {
      // 解析文件路径
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      logger.debug(`Absolute path: ${absolutePath}`);
      
      // 确保目录存在
      const dir = path.dirname(absolutePath);
      logger.debug(`Ensuring directory exists: ${dir}`);
      if (!fs.existsSync(dir)) {
        logger.debug(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (overwrite) {
        // 覆盖写入
        logger.debug(`Overwriting content to file`);
        fs.writeFileSync(absolutePath, content, 'utf8');
        logger.info(`Content overwritten successfully`);
        return `Overwrote to file: ${absolutePath}`;
      } else {
        // 追加写入
        logger.debug(`Appending content to file`);
        // 先添加换行符
        fs.appendFileSync(absolutePath, '\n' + content, 'utf8');
        logger.info(`Content appended successfully`);
        return `Appended to file: ${absolutePath}`;
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`, error);
      return `Failed to write file: ${error.message}`;
    }
  }
};

export default writeCommand;
