#!/usr/bin/env node

const readline = require('readline');
const { executeCommand } = require('../commands');
const useTextInput = require('../hooks/useTextInput');

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// 初始化状态
let input = '';
let textInputState = useTextInput({
  value: input,
  onChange: (newValue) => {
    input = newValue;
    // 重新显示提示符和输入内容
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write('> ' + input);
    // 移动光标到正确位置
    const cursorPosition = input.length;
    process.stdout.cursorTo(2 + cursorPosition); // 2 是提示符 "> " 的长度
  },
  onSubmit: (value) => {
    handleSubmit(value);
  },
  onExit: () => {
    rl.close();
    process.exit(0);
  }
});

// 处理输入
function handleInput(char, key) {
  // 确保 char 是字符串
  if (typeof char === 'string' && char.length > 0) {
    textInputState.handleInput(char, key);
  } else if (key) {
    textInputState.handleInput('', key);
  }
}

// 处理提交
function handleSubmit(value) {
  if (value.trim() === '') {
    rl.prompt();
    return;
  }
  
  // 检查是否是命令
  if (value.startsWith('/')) {
    const command = value.slice(1);
    const result = executeCommand(command);
    if (result) {
      console.log(result);
    }
  } else {
    // 处理普通输入
    console.log(`You entered: ${value}`);
  }
  
  // 重置输入和光标
  input = '';
  textInputState.setOffset(0);
  rl.prompt();
}

// 监听按键事件
process.stdin.on('keypress', (char, key) => {
  handleInput(char, key);
});

// 启动程序
console.log('Claudecode CLI Client');
console.log('Welcome to Claudecode!');
console.log('Type your message below:');
console.log('');
console.log('Commands:');
console.log('  /help: Show help message');
console.log('  /exit: Exit the program');
console.log('  /clear: Clear the terminal');
console.log('  /history: Show command history');
console.log('');

rl.prompt();

// 处理 SIGINT 信号
process.on('SIGINT', () => {
  if (input) {
    input = '';
    textInputState.setOffset(0);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    rl.prompt();
  } else {
    console.log('\nGoodbye!');
    process.exit(0);
  }
});