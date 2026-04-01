// 命令注册和管理

const commands = {};

function registerCommand(name, handler, description) {
  commands[name] = {
    handler,
    description
  };
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

// 注册默认命令
registerCommand('help', () => {
  let helpText = '=== Claudecode CLI Help ===\n\n';
  helpText += 'Available commands:\n\n';
  for (const [name, command] of Object.entries(commands)) {
    helpText += `  /${name}: ${command.description}\n`;
  }
  helpText += '\n=== Usage Examples ===\n';
  helpText += '  /help                    - Show this help message\n';
  helpText += '  /exit                    - Exit the program\n';
  helpText += '  /clear                   - Clear the terminal\n';
  helpText += '  /history                 - Show command history\n';
  helpText += '\n=== Keyboard Shortcuts ===\n';
  helpText += '  Up Arrow                 - Previous command\n';
  helpText += '  Down Arrow               - Next command\n';
  helpText += '  Ctrl+C                   - Clear input or exit\n';
  helpText += '  Ctrl+D                   - Delete character or exit\n';
  helpText += '\n=== Customization ===\n';
  helpText += 'To customize this help message, edit the help command in src/commands.js\n';
  return helpText;
}, 'Show detailed help message with usage examples and shortcuts');

registerCommand('exit', () => {
  process.exit(0);
}, 'Exit the program');

registerCommand('clear', () => {
  console.clear();
  return 'Terminal cleared';
}, 'Clear the terminal');

registerCommand('history', () => {
  const { getHistory } = require('./history');
  const history = getHistory();
  if (history.length === 0) {
    return 'No history available';
  }
  let historyText = 'History:\n';
  history.forEach((item, index) => {
    historyText += `${index + 1}. ${item}\n`;
  });
  return historyText;
}, 'Show command history');

module.exports = {
  registerCommand,
  executeCommand,
  getCommands,
  hasCommand
};