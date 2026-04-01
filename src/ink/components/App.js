const React = require('react');
const { useState, useEffect } = React;
const { useInput } = require('ink');
const Box = require('./Box');
const Text = require('./Text');
const { executeCommand } = require('../../commands');
const { addToHistory, getHistoryUp, getHistoryDown, resetHistory } = require('../../history');

function App() {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [messages, setMessages] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState([]);

  // 处理输入
  useInput((inputChar, key) => {
    if (key.return) {
      // 处理回车键
      if (input.trim() !== '') {
        handleSubmit(input);
      }
    } else if (key.backspace || key.delete) {
      // 处理退格键和删除键
      if (cursorPosition > 0) {
        const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
        setInput(newInput);
        setCursorPosition(prev => Math.max(0, prev - 1));
      }
    } else if (key.leftArrow) {
      // 左箭头 - 移动光标
      setCursorPosition(prev => Math.max(0, prev - 1));
    } else if (key.rightArrow) {
      // 右箭头 - 移动光标
      setCursorPosition(prev => Math.min(input.length, prev + 1));
    } else if (key.upArrow) {
      // 上箭头 - 历史记录
      if (history.length > 0) {
        setHistoryIndex(prev => {
          const newIndex = prev === -1 ? history.length - 1 : Math.max(0, prev - 1);
          const historyValue = history[newIndex];
          setInput(historyValue);
          setCursorPosition(historyValue.length);
          return newIndex;
        });
      }
    } else if (key.downArrow) {
      // 下箭头 - 历史记录
      if (history.length > 0) {
        setHistoryIndex(prev => {
          if (prev < history.length - 1) {
            const newIndex = prev + 1;
            const historyValue = history[newIndex];
            setInput(historyValue);
            setCursorPosition(historyValue.length);
            return newIndex;
          } else {
            setInput('');
            setCursorPosition(0);
            return -1;
          }
        });
      }
    } else if (key.ctrl && key.c) {
      // Ctrl+C
      if (input) {
        setInput('');
        setCursorPosition(0);
        resetHistory();
      } else {
        process.exit(0);
      }
    } else if (typeof inputChar === 'string' && inputChar.length > 0 && !key.escape) {
      // 普通字符输入，排除转义序列
      // 处理中文字符，确保光标位置正确
      const newInput = input.slice(0, cursorPosition) + inputChar + input.slice(cursorPosition);
      setInput(newInput);
      // 光标位置应该移动到输入字符后的位置，考虑到可能输入多个字符的情况
      setCursorPosition(prev => prev + inputChar.length);
    }
  });

  // 处理提交
  function handleSubmit(value) {
    // 添加到历史记录
    addToHistory(value);
    setHistory([...history, value]);
    setHistoryIndex(-1);

    let response;
    // 检查是否是命令
    if (value.startsWith('/')) {
      const command = value.slice(1);
      response = executeCommand(command);
    } else {
      // 处理普通输入
      response = `You entered: ${value}`;
    }

    // 添加到消息列表
    setMessages(prev => [
      ...prev,
      { type: 'user', text: value },
      { type: 'system', text: response || '' }
    ]);

    // 清空输入
    setInput('');
    setCursorPosition(0);
  }

  return React.createElement(Box, { flexDirection: 'column', height: '100%' },
    // 标题
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { bold: true }, 'Claudecode CLI Client')
    ),
    
    // 欢迎信息
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, null, 'Welcome to Claudecode!')
    ),
    
    // 命令提示
    React.createElement(Box, { marginBottom: 2, flexDirection: 'column' },
      React.createElement(Text, null, 'APP Commands:'),
      React.createElement(Box, { marginLeft: 2, flexDirection: 'column' },
        React.createElement(Text, null, '/help: Show help message'),
        React.createElement(Text, null, '/exit: Exit the program'),
        React.createElement(Text, null, '/clear: Clear the terminal'),
        React.createElement(Text, null, '/history: Show command history')
      )
    ),
    
    // 消息列表
    React.createElement(Box, { flex: 1, overflow: 'scroll', marginBottom: 2, flexDirection: 'column' },
      messages.map((message, index) => React.createElement(Box, { key: index, marginBottom: 1, flexDirection: 'column' },
        React.createElement(Text, { color: message.type === 'user' ? 'green' : 'blue' },
          message.type === 'user' ? '> ' : '  ',
          message.text
        )
      ))
    ),
    
    // 输入区域
    React.createElement(Box, { flexDirection: 'row', alignItems: 'center' },
      React.createElement(Text, null, '> '),
      React.createElement(Text, null, input.slice(0, cursorPosition)),
      React.createElement(Text, { inverse: true }, input[cursorPosition] || ' '),
      React.createElement(Text, null, input.slice(cursorPosition + 1))
    )
  );
}

module.exports = App;