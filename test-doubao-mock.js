// 测试 Doubao Mock API 的脚本
// 使用方式: node test-doubao-mock.js

import * as doubaoMock from './src/services/api/doubao-mock.js';
import { config } from './src/config/index.js';

// 初始化配置
config.init();

async function testMock() {
  console.log('=== 测试 Doubao Mock API ===\n');

  // ==================== 测试 1: 简单消息响应 ====================
  console.log('1. 测试简单消息响应');
  const testMessages = [
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'Hello, please introduce yourself.'
      }
    }
  ];

  console.log('输入消息:', testMessages[0].message.content);
  
  for await (const message of doubaoMock.callModel({
    messages: testMessages,
    systemPrompt: 'You are a helpful AI assistant.',
    tools: [],
    signal: null,
    options: {
      model: 'doubao-pro-32k',
      isNonInteractiveSession: true,
      querySource: 'test'
    }
  })) {
    console.log('=====:', message);

    if (message.type === 'assistant') {
      console.log('响应内容:', message.message.content);
    } else if (message.type === 'usage') {
      console.log('使用量:', message.usage);
    }
  }

  // ==================== 测试 2: 工具调用响应 ====================
  console.log('\n2. 测试工具调用响应');
  
  const testTools = [
    {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    },
    {
      name: 'read_file',
      description: 'Read content from a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' }
        },
        required: ['path']
      }
    }
  ];

  const toolMessages = [
    {
      type: 'user',
      message: {
        role: 'user',
        content: 'Create 创建 a file named test_file.txt with content hello world.'
      }
    }
  ];

  console.log('输入消息:', toolMessages[0].message.content);
  console.log('可用工具:', testTools.map(t => t.name).join(', '));

  for await (const message of doubaoMock.callModel({
    messages: toolMessages,
    systemPrompt: 'You are a helpful AI assistant.',
    tools: testTools,
    signal: null,
    options: {
      model: 'doubao-pro-32k',
      isNonInteractiveSession: true,
      querySource: 'test'
    }
  })) {
    console.log('=====:', message);
    if (message.type === 'assistant') {
      console.log('响应内容:', JSON.stringify(message.message.content, null, 2));
      console.log('工具调用:', JSON.stringify(message.message.tool_calls, null, 2));
    } else if (message.type === 'usage') {
      console.log('使用量:', message.usage);
    }
  }
}

// 执行测试
testMock().catch(console.error);