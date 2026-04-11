// Mock API service for Doubao - 用于调试和测试
// 仿照 doubao.js 的接口，但返回模拟数据

import { uuid } from '../../query.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { AssistantMessage, ThinkingMessage } from '../../types/message.js';


// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), '.claude', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 模拟响应数据
const mockResponses = {
  simple: {
    content: '你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？你好！我是豆包AI助手，很高兴为你服务。有什么我可以帮助你的吗？',
    stop_reason: 'end_turn'
  },
  tool_call: {
    tool_calls: [
      {
        id: 'call_12345',
        function: {
          name: 'write_file',
          arguments: JSON.stringify({ path: 'test_file.txt', content: 'hello world' })
        }
      }
    ],
    stop_reason: 'tool_calls'
  },
  read_file: {
    tool_calls: [
      {
        id: 'call_67890',
        function: {
          name: 'read_file',
          arguments: JSON.stringify({ path: 'test_file.txt' })
        }
      }
    ],
    stop_reason: 'tool_calls'
  }
};

/**
 * Mock Doubao API 调用函数
 * 与真实的 callModel 接口保持一致，但返回模拟数据
 */
export async function* callModel({ messages, systemPrompt, tools, signal, options }) {
  const logId = uuid();
  const logFileName = path.join(LOG_DIR, `${logId}-mock.json`);
  
  // 计算输入tokens
  function calculateInputTokens() {
    let tokens = 0;
    if (systemPrompt) {
      tokens += systemPrompt.length;
    }
    for (const msg of messages) {
      if (msg.message && msg.message.content) {
        if (typeof msg.message.content === 'string') {
          tokens += msg.message.content.length;
        } else {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              tokens += block.text.length;
            } else if (block.type === 'tool_result') {
              tokens += block.content.length;
            }
          }
        }
      }
    }
    return tokens;
  }

  const logData = {
    id: logId,
    timestamp: new Date().toISOString(),
    provider: options.provider || 'default',
    request: {
      model: options.model || 'default',
      systemPrompt: systemPrompt,
      messages: messages,
      tools: tools
    },
    response: {
      content: '',
      usage: {
        input_tokens: calculateInputTokens(),
        output_tokens: 0,
        total_tokens: 0
      }
    },
    error: null
  };

  let usage = {
    input_tokens: calculateInputTokens(),
    output_tokens: 0,
    total_tokens: 0
  };

  const toolsCount = tools ? tools.length : 0;
  logger.info(`[MOCK] Calling Doubao model with: ${options.model}, messages: ${messages.length}, tools: ${toolsCount}, logId: ${logId}`);

  // 构建请求体（仅用于日志记录）
  const requestBody = {
    model: options.model || 'default',
    messages: formatMessages(messages, systemPrompt),
    stream: true,
    ...(tools.length > 0 && {
      tools: formatTools(tools),
      tool_choice: 'auto'
    })
  };
  
  console.log("[MOCK] 请求体:", JSON.stringify(requestBody, null, 2));

  // 检查是否需要模拟工具调用
  const lastMessage = messages[messages.length - 1];
  console.log("lastMessage=", lastMessage);
  let responseType = 'simple';
  
  if (tools && tools.length > 0) {
    const content = lastMessage?.message?.content;
    if (typeof content === 'string') {
      if (content.includes('创建') || content.includes('write') || content.includes('文件')) {
        responseType = 'tool_call';
      } else if (content.includes('读取') || content.includes('read') || content.includes('查看')) {
        responseType = 'read_file';
      }
    }
  }

  const response = mockResponses[responseType];
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // 模拟流式响应
  let assistantMessage = {
    role: 'assistant',
    content: [],
    reason: [],
    tool_calls: [],
    stop_reason: null
  };

  let toolCallBuffer = { name: '', arguments: '' };
  let contentBuffer = "";
  let reasonBuffer = "";
  let uuid_id = `doubao-${Date.now()}`

  if (response.content) {
    // 模拟逐字输出
    reasonBuffer = response.content;
    contentBuffer = response.content;
    const words = response.content.split('');
    let _buffer = "";
    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      const char = words[i];
      _buffer += char;
      
      // 每5个字符发送一次
      if ((i + 1) % 5 === 0 || i === words.length - 1) {
        // 模拟流式输出
        yield new ThinkingMessage({
          role: 'assistant',
          content: _buffer
          }, uuid_id);
        _buffer = "";
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    yield new ThinkingMessage({
      role: 'assistant',
      content: _buffer,
      stop_reason: 'end_turn'
      }, uuid_id);
  }

  // 处理工具调用
  if (response.tool_calls) {
    for (const toolCall of response.tool_calls) {
      toolCallBuffer = { name: toolCall.function.name, arguments: toolCall.function.arguments || '' };
    }
  }

  // 处理完成 开始赋值
  
  assistantMessage.content = contentBuffer;
  assistantMessage.reason = reasonBuffer;
  assistantMessage.tool_calls = [toolCallBuffer];

  logData.response.content = contentBuffer;
  logData.response.reason = reasonBuffer;
  logData.response.tool_calls = JSON.stringify(toolCallBuffer);
  
  // 写入日志
  fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
  logger.info(`[MOCK] Log saved to: ${logFileName}, Usage: ${JSON.stringify(logData.response.usage)}`);

  // 返回助手消息
  yield new AssistantMessage({
    role: 'assistant',
    content: assistantMessage.content,
    reason: assistantMessage.reason,
    tool_calls: assistantMessage.tool_calls,
    stop_reason: assistantMessage.stop_reason || 'end_turn'
  }, uuid_id);

  // 返回用量统计
  yield {
    type: 'usage',
    usage: usage
  };
}

/**
 * 格式化消息为 Doubao API 格式
 */
function formatMessages(messages, systemPrompt) {
  const formatted = [];
  
  if (systemPrompt) {
    formatted.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  for (const msg of messages) {
    if (msg.type === 'user') {
      formatted.push({
        role: 'user',
        content: formatUserContent(msg.message.content)
      });
    } else if (msg.type === 'assistant') {
      const assistantContent = formatAssistantContent(msg.message.content);
      if (assistantContent && (typeof assistantContent === 'string' || assistantContent.length > 0)) {
        formatted.push({
          role: 'assistant',
          content: assistantContent
        });
      }
    }
  }
  
  return formatted;
}

function formatUserContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  
  const toolResults = content.filter(block => block.type === 'tool_result');
  if (toolResults.length > 0) {
    return toolResults.map(block => {
      if (block.is_error) {
        return `[Tool Error]: ${block.content}`;
      }
      return `[Tool Result]: ${block.content}`;
    }).join('\n');
  }
  
  const textBlocks = content.filter(block => block.type === 'text');
  return textBlocks.map(block => block.text).join('\n');
}

function formatAssistantContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  
  return content.map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    }
    return null;
  }).filter(Boolean);
}

function formatTools(tools) {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema || tool.parameters || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }));
}

/**
 * 更新使用量统计
 */
export function updateUsage(current, delta) {
  if (!delta) return current;
  return {
    input_tokens: (current.input_tokens || 0) + (delta.input_tokens || 0),
    output_tokens: (current.output_tokens || 0) + (delta.output_tokens || 0),
    total_tokens: (current.total_tokens || 0) + (delta.total_tokens || 0)
  };
}

/**
 * 累积使用量
 */
export function accumulateUsage(total, current) {
  return {
    input_tokens: (total.input_tokens || 0) + (current.input_tokens || 0),
    output_tokens: (total.output_tokens || 0) + (current.output_tokens || 0),
    total_tokens: (total.total_tokens || 0) + (current.total_tokens || 0)
  };
}

/**
 * 验证 API Key（模拟）
 */
export async function verifyApiKey(apiKey, isNonInteractiveSession = false) {
  console.log(`[MOCK] 验证 API Key: ${apiKey ? '已提供' : '未提供'}`);
  // 模拟验证逻辑：非交互式会话直接返回true，否则检查是否有API Key
  if (isNonInteractiveSession) {
    return true;
  }
  return !!apiKey;
}

/**
 * 设置自定义响应（用于测试）
 */
export function setMockResponse(type, response) {
  if (mockResponses[type]) {
    mockResponses[type] = response;
    console.log(`[MOCK] 已设置自定义响应: ${type}`);
  } else {
    console.warn(`[MOCK] 未知的响应类型: ${type}`);
  }
}

/**
 * 获取当前模拟响应配置
 */
export function getMockResponses() {
  return { ...mockResponses };
}