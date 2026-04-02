import React, { useState, useEffect } from 'react';
import { useInput } from 'ink';
import Box from './Box.js';
import Text from './Text.js';
import { executeCommand } from '../../commands.js';
import { addToHistory, resetHistory } from '../../history.js';
import serviceManager from '../../services/index.js';

function App() {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [messages, setMessages] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [history, setHistory] = useState([]);
  
  // 初始化定时任务调度器
  useEffect(() => {
    // 初始化服务
    serviceManager.init({
      cronScheduler: {
        onFire: (prompt) => {
          setMessages(prev => [
            ...prev,
            { type: 'system', text: '=== Scheduled Task Fired ===' },
            { type: 'system', text: prompt },
            { type: 'system', text: '============================' }
          ]);
        }
      }
    });
    
    // 组件卸载时停止服务
    return () => {
      serviceManager.stop();
    };
  }, []);

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
  async function handleSubmit(value) {
    // 添加到历史记录
    addToHistory(value);
    setHistory([...history, value]);
    setHistoryIndex(-1);

    // 清空输入
    setInput('');
    setCursorPosition(0);

    // 检查是否是命令
    if (value.startsWith('/')) {
      const command = value.slice(1);
      try {
        const response = await executeCommand(command);
        // 添加到消息列表
        setMessages(prev => [
          ...prev,
          { type: 'user', text: value },
          { type: 'system', text: response || '' }
        ]);
      } catch (error) {
        // 添加到消息列表
        setMessages(prev => [
          ...prev,
          { type: 'user', text: value },
          { type: 'system', text: `Error: ${error.message}` }
        ]);
      }
    } else {
      // 处理普通输入 - 使用 AI 服务进行对话
      await handleAIConversation(value);
    }
  }

  // 处理 AI 对话
  async function handleAIConversation(prompt) {
    const aiService = serviceManager.getService('ai');
    
    if (!aiService) {
      setMessages(prev => [
        ...prev,
        { type: 'user', text: prompt },
        { type: 'system', text: 'AI service not initialized' }
      ]);
      return;
    }

    if (aiService.isBusy()) {
      setMessages(prev => [
        ...prev,
        { type: 'user', text: prompt },
        { type: 'system', text: 'AI is currently processing a message. Please wait...' }
      ]);
      return;
    }

    try {
      // 清空消息历史，避免累积历史消息
      // aiService.clearMessages();
      
      // 添加用户消息
      setMessages(prev => [
        ...prev,
        { type: 'user', text: prompt }
      ]);

      // 累积助手消息内容
      let assistantMessageContent = '';
      
      // 处理消息流
      for await (const message of aiService.sendMessage(prompt)) {
        switch (message.type) {
          case 'assistant':
            // 处理助手消息
            const assistantContent = message.message.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('');
            if (assistantContent) {
              assistantMessageContent += assistantContent;
              // 更新最后一条消息（如果是系统消息）
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === 'system' && lastMessage.isAssistant) {
                  lastMessage.text = assistantMessageContent;
                } else {
                  newMessages.push({ type: 'system', text: assistantMessageContent, isAssistant: true });
                }
                return newMessages;
              });
            }
            break;
            
          case 'user':
            // 处理用户消息（工具结果等）
            const userContent = message.message.content
              .filter(block => block.type === 'tool_result')
              .map(block => {
                if (block.is_error) {
                  return `[Tool Error]: ${block.content}`;
                }
                return `[Tool Result]: ${block.content}`;
              })
              .join('\n');
            if (userContent) {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: userContent }
              ]);
            }
            break;
            
          case 'system':
            // 处理系统消息
            if (message.subtype === 'api_error') {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: `[API Error]: ${message.content}` }
              ]);
            }
            break;
            
          case 'result':
            // 处理最终结果
            if (message.subtype === 'success') {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: `[Usage]: ${JSON.stringify(message.usage)}` }
              ]);
            } else if (message.is_error) {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: `[Error]: ${message.result || 'An error occurred'}` }
              ]);
            }
            break;
            
          case 'progress':
            // 处理进度消息
            setMessages(prev => [
              ...prev,
              { type: 'system', text: `[Progress]: ${message.content}` }
            ]);
            break;
            
          case 'attachment':
            // 处理附件消息
            if (message.attachment.type === 'max_turns_reached') {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: `[Info]: Maximum turns (${message.attachment.maxTurns}) reached` }
              ]);
            } else if (message.attachment.type === 'max_budget_reached') {
              setMessages(prev => [
                ...prev,
                { type: 'system', text: `[Info]: Maximum budget ($${message.attachment.budget}) reached` }
              ]);
            }
            break;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages(prev => [
          ...prev,
          { type: 'system', text: '[Interrupted]: AI response was interrupted' }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { type: 'system', text: `[Error]: ${error.message}` }
        ]);
      }
    }
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
        React.createElement(Text, null, '/history: Show command history'),
        React.createElement(Text, null, '/model: View or switch AI model'),
        React.createElement(Text, null, '/reset: Clear AI conversation history')
      )
    ),
    
    // AI 对话提示
    React.createElement(Box, { marginBottom: 2, flexDirection: 'column' },
      React.createElement(Text, null, 'AI Conversation:'),
      React.createElement(Box, { marginLeft: 2, flexDirection: 'column' },
        React.createElement(Text, null, 'Just type your message to chat with AI'),
        React.createElement(Text, null, 'AI will respond using the QueryEngine')
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

export default App;