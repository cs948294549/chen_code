#!/usr/bin/env node

import readline from 'readline';
import { executeCommand } from '../commands.js';
import useTextInput from '../hooks/useTextInput.js';
import serviceManager from '../services/index.js';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// 初始化状态
let input = '';
let textInputState = useTextInput({
  getValue: () => input,
  onChange: (newValue) => {
    input = newValue;
    // 重新显示提示符和输入内容
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write('> ' + input);
    // 移动光标到正确位置
    // 使用 textInputState.offset 作为光标位置
    const cursorPosition = textInputState.offset;
    // 计算中文字符的宽度偏移（中文字符在终端中占用 2 个字符宽度）
    const chineseChars = input.slice(0, cursorPosition).match(/[\u4e00-\u9fa5]/g);
    const chineseWidth = chineseChars ? chineseChars.length : 0;
    // 光标位置 = 基础位置 + 字符偏移 + 中文字符宽度偏移
    const finalPosition = 2 + cursorPosition + chineseWidth;
    process.stdout.cursorTo(finalPosition); // 2 是提示符 "> " 的长度
  },
  onSubmit: async (value) => {
    await handleSubmit(value);
  },
  onExit: () => {
    rl.close();
    process.exit(0);
  }
});

// 处理输入
function handleInput(char, key) {
  // 转换 key 对象为 useTextInput 预期的格式
  const convertedKey = {};
  if (key) {
    // 转换特殊键
    if (key.name === 'backspace') {
      convertedKey.backspace = true;
    } else if (key.name === 'delete') {
      convertedKey.delete = true;
    } else if (key.name === 'left') {
      convertedKey.left = true;
    } else if (key.name === 'right') {
      convertedKey.right = true;
    } else if (key.name === 'up') {
      convertedKey.up = true;
    } else if (key.name === 'down') {
      convertedKey.down = true;
    } else if (key.name === 'return') {
      convertedKey.return = true;
    }
    // 转换修饰键
    convertedKey.ctrl = key.ctrl;
    convertedKey.alt = key.alt;
    convertedKey.shift = key.shift;
  }
  
  // 确保 char 是字符串
  if (typeof char === 'string' && char.length > 0) {
    textInputState.handleInput(char, convertedKey);
  } else if (convertedKey) {
    textInputState.handleInput('', convertedKey);
  }
}

// 处理提交
async function handleSubmit(value) {
  if (value.trim() === '') {
    rl.prompt();
    return;
  }
  
  // 检查是否是命令
  if (value.startsWith('/')) {
    const command = value.slice(1);
    try {
      const result = await executeCommand(command);
      if (result) {
        console.log(result);
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
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

// 初始化服务
serviceManager.init();
const scheduler = serviceManager.getService('cronScheduler');

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
    serviceManager.stop();
    process.exit(0);
  }
});