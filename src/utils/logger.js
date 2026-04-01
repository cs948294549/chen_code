import fs from 'fs';
import path from 'path';

// 日志级别
export const LogLevel = {
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

const LEVEL_ORDER = {
  [LogLevel.VERBOSE]: 0,
  [LogLevel.DEBUG]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4
};

// 确保 log 文件夹存在
const logDir = path.join(process.cwd(), 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志文件路径
const logFile = path.join(logDir, 'app.log');

// 日志记录类
class Logger {
  constructor(name) {
    this.name = name || 'app';
  }

  /**
   * 记录日志
   * @param {string} message 日志消息
   * @param {string} level 日志级别
   * @param {Error} error 错误对象（可选）
   */
  log(message, level = LogLevel.INFO, error = null) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`;
    
    if (error) {
      logMessage += `\nError: ${error.message}`;
      if (error.stack) {
        logMessage += `\nStack: ${error.stack}`;
      }
    }
    
    logMessage += '\n';
    
    // 写入文件
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (err) {
      // 如果写入文件失败，输出到控制台
      console.error('Failed to write log:', err);
      console.error(logMessage);
    }
  }

  /**
   * 记录详细信息
   * @param {string} message 日志消息
   * @param {Error} error 错误对象（可选）
   */
  verbose(message, error = null) {
    this.log(message, LogLevel.VERBOSE, error);
  }

  /**
   * 记录调试信息
   * @param {string} message 日志消息
   * @param {Error} error 错误对象（可选）
   */
  debug(message, error = null) {
    this.log(message, LogLevel.DEBUG, error);
  }

  /**
   * 记录信息
   * @param {string} message 日志消息
   * @param {Error} error 错误对象（可选）
   */
  info(message, error = null) {
    this.log(message, LogLevel.INFO, error);
  }

  /**
   * 记录警告
   * @param {string} message 日志消息
   * @param {Error} error 错误对象（可选）
   */
  warn(message, error = null) {
    this.log(message, LogLevel.WARN, error);
  }

  /**
   * 记录错误
   * @param {string} message 日志消息
   * @param {Error} error 错误对象（可选）
   */
  error(message, error = null) {
    this.log(message, LogLevel.ERROR, error);
  }
}

// 导出默认实例
export const logger = new Logger();

// 导出工厂函数
export function createLogger(name) {
  return new Logger(name);
}

// 导出模块
export default logger;