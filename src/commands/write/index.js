import { createLogger } from '../../utils/logger.js';
import { FileOperations } from '../../utils/operations/files/index.js';

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

    const overwrite = args.includes('--overwrite');
    const filteredArgs = args.filter(arg => arg !== '--overwrite');
    const filePath = filteredArgs[0];
    let content = filteredArgs.slice(1).join(' ');
    
    const now = new Date();
    const timestamp = now.toISOString();
    const datetime = now.toLocaleString();
    
    content = content.replace(/{timestamp}/g, timestamp);
    content = content.replace(/{datetime}/g, datetime);

    logger.info(`Writing to ${filePath}: ${content}`);

    try {
      const result = FileOperations.writeFile(filePath, content, {
        append: !overwrite,
        addNewline: !overwrite
      });
      
      logger.info(`Content ${result.operation === 'append' ? 'appended' : 'overwritten'} successfully`);
      return `${result.operation === 'append' ? 'Appended' : 'Overwrote'} to file: ${result.path}`;
    } catch (error) {
      logger.error(`Error: ${error.message}`, error);
      return `Failed to write file: ${error.message}`;
    }
  }
};

export default writeCommand;
