const helpCommand = {
  name: 'help',
  description: 'Show detailed help message with usage examples and shortcuts',
  source: 'builtin',
  handler: (args) => {
    const { getCommands, formatDescriptionWithSource } = require('../../commands');
    const commands = getCommands();
    
    let helpText = '=== Claudecode CLI Help ===\n\n';
    helpText += 'Available commands:\n\n';
    for (const [name, command] of Object.entries(commands)) {
      helpText += `  /${name}: ${formatDescriptionWithSource(command)}\n`;
    }
    helpText += '\n=== Usage Examples ===\n';
    helpText += '  /help                    - Show this help message\n';
    helpText += '  /exit                    - Exit the program\n';
    helpText += '  /clear                   - Clear the terminal\n';
    helpText += '  /history                 - Show command history\n';
    helpText += '  /touch file1.txt         - Create a new file\n';
    helpText += '  /write file.txt content  - Write content to a file\n';
    helpText += '\n=== Keyboard Shortcuts ===\n';
    helpText += '  Up Arrow                 - Previous command\n';
    helpText += '  Down Arrow               - Next command\n';
    helpText += '  Left Arrow               - Move cursor left\n';
    helpText += '  Right Arrow              - Move cursor right\n';
    helpText += '  Backspace/Delete         - Delete character\n';
    helpText += '  Ctrl+C                   - Clear input or exit\n';
    helpText += '  Ctrl+D                   - Delete character or exit\n';
    helpText += '\n=== Customization ===\n';
    helpText += 'To customize this help message, edit the help command in src/commands/help/index.js\n';
    helpText += 'To add new commands, create a new directory under src/commands/ with an index.js file\n';
    return helpText;
  }
};

module.exports = helpCommand;
