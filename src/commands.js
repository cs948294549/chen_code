// 命令注册和管理

const fs = require('fs');
const path = require('path');

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

function executeCommand(input) {
  const parts = input.trim().split(' ');
  const commandName = parts[0];
  const args = parts.slice(1);
  
  if (commands[commandName]) {
    return commands[commandName].handler(args);
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

// 加载命令目录
function loadCommandsFromDirectory(directory) {
  try {
    const commandFiles = fs.readdirSync(directory);
    for (const commandFile of commandFiles) {
      const commandPath = path.join(directory, commandFile);
      const commandStats = fs.statSync(commandPath);
      
      if (commandStats.isDirectory()) {
        // 加载子目录中的命令
        const indexPath = path.join(commandPath, 'index.js');
        if (fs.existsSync(indexPath)) {
          const command = require(indexPath);
          if (command.name && command.handler) {
            registerCommand(command.name, command.handler, command.description, command);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading commands:', error);
  }
}

// 初始化命令系统
function initCommands() {
  // 加载内置命令
  const commandsDir = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsDir)) {
    loadCommandsFromDirectory(commandsDir);
  }
  
  // 可以在这里加载额外的命令
  // 例如从插件、外部目录等
}

// 初始化命令
initCommands();

module.exports = {
  registerCommand,
  registerCommandSource,
  executeCommand,
  getCommands,
  hasCommand,
  findCommand,
  formatDescriptionWithSource,
  loadCommandsFromDirectory,
  initCommands
};

