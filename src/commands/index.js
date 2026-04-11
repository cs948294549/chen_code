// 命令注册和管理
import helpCommand from './help/index.js';
import exitCommand from './exit/index.js';
import clearCommand from './clear/index.js';
import historyCommand from './history/index.js';
import touchCommand from './touch/index.js';
import writeCommand from './write/index.js';
import cronCreateCommand from './cron/create/index.js';
import cronDeleteCommand from './cron/delete/index.js';
import cronListCommand from './cron/list/index.js';
import modelCommand from './model/index.js';
import resetCommand from './reset/index.js';
import aiCommand from './ai/index.js';

const commands = {};
const commandSources = {};

function registerCommand(name, handler, description, options = {}) {
  commands[name] = {
    name,
    handler,
    description,
    ...options
  };
}

function registerCommandSource(source, commandsList) {
  commandSources[source] = commandsList;
}

async function executeCommand(input) {
  const parts = input.trim().split(' ');
  const commandName = parts[0];
  const args = parts.slice(1);
  
  if (commands[commandName]) {
    try {
      return await commands[commandName].handler(args);
    } catch (error) {
      return `Error executing command: ${error.message}`;
    }
  } else {
    return `Unknown command: ${commandName}. Type '/help' for available commands.`;
  }
}

function getCommands() {
  return commands;
}

function hasCommand(name) {
  return !!commands[name];
}

function findCommand(commandName) {
  return commands[commandName];
}

function formatDescriptionWithSource(cmd) {
  if (cmd.source) {
    return `${cmd.description} (${cmd.source})`;
  }
  return cmd.description;
}

// 初始化命令系统
function initCommands() {
  // 直接注册所有命令
  
  // 基础命令
  registerCommand('help', helpCommand.handler, 'Show detailed help message', { source: 'builtin' });
  registerCommand('exit', exitCommand.handler, 'Exit the program', { source: 'builtin' });
  registerCommand('clear', clearCommand.handler, 'Clear the terminal', { source: 'builtin' });
  registerCommand('history', historyCommand.handler, 'Show command history', { source: 'builtin' });
  registerCommand('touch', touchCommand.handler, 'Create new files', { source: 'builtin' });
  registerCommand('write', writeCommand.handler, 'Write content to files', { source: 'builtin' });
  
  // cron 相关命令
  registerCommand('cron:create', cronCreateCommand.handler, 'Create a scheduled task', { source: 'builtin' });
  registerCommand('cron:delete', cronDeleteCommand.handler, 'Delete a scheduled task', { source: 'builtin' });
  registerCommand('cron:list', cronListCommand.handler, 'List all scheduled tasks', { source: 'builtin' });
  
  // AI 相关命令
  registerCommand('ai', aiCommand.handler, 'Send a message to AI assistant', { source: 'builtin' });
  registerCommand('model', modelCommand.handler, 'Switch or view the current AI model', { source: 'builtin' });
  registerCommand('reset', resetCommand.handler, 'Clear the AI conversation history', { source: 'builtin' });
  
  // 可以在这里加载额外的命令
  // 例如从插件、外部目录等
}

// 初始化命令
initCommands();

export {
  registerCommand,
  registerCommandSource,
  executeCommand,
  getCommands,
  hasCommand,
  findCommand,
  formatDescriptionWithSource,
  initCommands
};