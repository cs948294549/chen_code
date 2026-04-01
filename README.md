# Claudecode Client

A CLI client for Claudecode, implemented based on the structure of the claude-code repository.

## Features

- **Basic CLI functionality** with input/output
- **Ink UI support** for modern terminal interface
- **Command handling system** with support for custom commands
- **History management** with arrow key navigation
- **Cursor movement** with left/right arrow keys
- **Chinese character support** with proper cursor positioning
- **Shortcut keys** support (Ctrl+C, Ctrl+D, etc.)
- **Structured IO** for consistent output

## Getting Started

### Prerequisites

- Node.js installed on your system

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies

```bash
npm install
```

### Usage

#### Run the CLI version:

```bash
# Using npm start
npm start

# Or directly with node
node src/entrypoints/cli.js
```

#### Run the Ink UI version:

```bash
# Using npm script
npm run start:ink

# Or directly with node
node src/entrypoints/cli-ink.js
```

### Available Commands

- `help`: Show detailed help message with usage examples and shortcuts
- `exit`: Exit the program
- `clear`: Clear the terminal
- `history`: Show command history

## Project Structure

```
src/
├── entrypoints/
│   ├── cli.js          # CLI entry point
│   ├── cli-ink.js      # Ink UI entry point
│   └── ink.js          # Ink module entry point
├── hooks/
│   └── useTextInput.js # Text input handling hook
├── ink/
│   └── components/
│       ├── App.js      # Ink main application component
│       ├── Box.js      # Layout component
│       └── Text.js     # Text component
├── utils/
│   └── Cursor.js       # Cursor management utility
├── commands.js         # Command registration and execution
└── history.js          # History management
```

## Keyboard Shortcuts

- **Up Arrow**: Previous command
- **Down Arrow**: Next command
- **Left Arrow**: Move cursor left
- **Right Arrow**: Move cursor right
- **Backspace/Delete**: Delete character
- **Ctrl+C**: Clear input or exit
- **Ctrl+D**: Delete character or exit

## Customization

To customize the help message, edit the help command in `src/commands.js`.

## Future Enhancements

- Implement more commands
- Add backend integration
- Improve error handling
- Add configuration options
- Add syntax highlighting
- Add auto-completion
