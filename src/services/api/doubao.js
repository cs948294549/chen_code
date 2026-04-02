// API service for Doubao (ByteDance)
// 参考 claude-code/src/services/api/claude.ts 的架构设计

import { config } from '../../config/index.js';
import { uuid } from '../../query.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), '.claude', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Doubao API 调用函数
 * 使用 async generator 模式，与 Claude API 保持一致
 * 
 * @param {Object} params - 调用参数
 * @param {Array} params.messages - 消息历史
 * @param {string} params.systemPrompt - 系统提示词
 * @param {Array} params.tools - 可用工具列表
 * @param {AbortSignal} params.signal - 中断信号
 * @param {Object} params.options - 其他选项
 * @param {string} params.options.model - 模型名称
 * @param {boolean} params.options.isNonInteractiveSession - 是否非交互式会话
 * @param {string} params.options.querySource - 查询来源
 */
export async function* callModel({ messages, systemPrompt, tools, signal, options }) {
  // 从配置读取 API Key
  const apiKey = config.get('doubao.apiKey');
  
  if (!apiKey) {
    throw new Error('Doubao API key not configured. Please set it in config file.');
  }

  // 生成UUID用于日志文件名
  const logId = uuid();
  const logFileName = path.join(LOG_DIR, `${logId}.json`);
  
  // 计算输入tokens
  function calculateInputTokens() {
    let tokens = 0;
    
    // 计算系统提示词tokens
    if (systemPrompt) {
      tokens += systemPrompt.length;
    }
    
    // 计算消息历史tokens
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

  // 日志数据
  const logData = {
    id: logId,
    timestamp: new Date().toISOString(),
    provider: 'doubao',
    request: {
      model: null,
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
  
  // 用量统计，用于传递回调用者
  let usage = {
    input_tokens: logData.response.usage.input_tokens,
    output_tokens: 0,
    total_tokens: 0
  };

  // 获取模型配置
  const model = options.model || config.get('doubao.model') || 'doubao-pro-32k';
  let baseUrl = config.get('doubao.baseUrl') || 'https://ark.cn-beijing.volces.com/api/v3';
  
  // 确保baseUrl不以/结尾
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  logData.request.model = model;
  
  logger.info(`Calling Doubao model with: ${model}, messages: ${messages.length}, tools: ${tools.length}, logId: ${logId}`);

  // 构建请求体
  const requestBody = {
    model: model,
    messages: formatMessages(messages, systemPrompt),
    stream: true,
    ...(tools.length > 0 && {
      tools: formatTools(tools),
      tool_choice: 'auto'
    })
  };

  try {
    // 发起流式请求
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = `Doubao API error: ${error.error?.message || response.statusText}`;
      logData.error = errorMessage;
      fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
      logger.error(`Doubao API error: ${errorMessage}`, new Error(errorMessage));
      throw new Error(errorMessage);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';
    let assistantMessage = {
      role: 'assistant',
      content: [],
      stop_reason: null
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行

      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices?.[0]?.delta;
            
            if (delta) {
              // 处理文本内容
              if (delta.content) {
                logData.response.content += delta.content;
                // 更新输出tokens
                logData.response.usage.output_tokens += delta.content.length;
                usage.output_tokens = logData.response.usage.output_tokens;
                // 更新总tokens
                logData.response.usage.total_tokens = logData.response.usage.input_tokens + logData.response.usage.output_tokens;
                usage.total_tokens = logData.response.usage.total_tokens;
                
                accumulatedText += delta.content;
              }
              
              // 处理工具调用
              if (delta.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  // 计算工具调用的tokens
                  const toolCallText = `${toolCall.function.name} ${toolCall.function.arguments || ''}`;
                  logData.response.usage.output_tokens += toolCallText.length;
                  usage.output_tokens = logData.response.usage.output_tokens;
                  // 更新总tokens
                  logData.response.usage.total_tokens = logData.response.usage.input_tokens + logData.response.usage.output_tokens;
                  usage.total_tokens = logData.response.usage.total_tokens;
                  
                  assistantMessage.content.push({
                    type: 'tool_use',
                    id: toolCall.id,
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments || '{}')
                  });
                }
              }
            }
            
            // 检查是否完成
            if (data.choices?.[0]?.finish_reason) {
              assistantMessage.stop_reason = data.choices[0].finish_reason === 'tool_calls' 
                ? 'tool_use' 
                : 'end_turn';
            }
            
            // 检查是否有使用量统计
            if (data.usage) {
              // 适配不同的用量统计格式
              if (data.usage.prompt_tokens) {
                // 标准OpenAI格式
                logData.response.usage = {
                  input_tokens: data.usage.prompt_tokens || 0,
                  output_tokens: data.usage.completion_tokens || 0,
                  total_tokens: data.usage.total_tokens || 0
                };
              } else if (data.usage.input_text_tokens) {
                // 豆包端到端语音模型格式
                logData.response.usage = {
                  input_tokens: data.usage.input_text_tokens || 0,
                  output_tokens: data.usage.output_text_tokens || 0,
                  total_tokens: (data.usage.input_text_tokens || 0) + (data.usage.output_text_tokens || 0)
                };
              } else {
                // 其他格式
                logData.response.usage = {
                  input_tokens: data.usage.input_tokens || 0,
                  output_tokens: data.usage.output_tokens || 0,
                  total_tokens: data.usage.total_tokens || 0
                };
              }
              logger.info(`Usage data received: ${JSON.stringify(data.usage)}`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 将累积的文本添加到助手消息中
    if (accumulatedText) {
      assistantMessage.content.unshift({
        type: 'text',
        text: accumulatedText
      });
    }
    
    // 处理最后可能的不完整行
    if (buffer.trim()) {
      try {
        if (buffer.startsWith('data: ')) {
          const data = JSON.parse(buffer.slice(6));
          
          // 检查是否有使用量统计
          if (data.usage) {
            // 适配不同的用量统计格式
            if (data.usage.prompt_tokens) {
              // 标准OpenAI格式
              logData.response.usage = {
                input_tokens: data.usage.prompt_tokens || 0,
                output_tokens: data.usage.completion_tokens || 0,
                total_tokens: data.usage.total_tokens || 0
              };
            } else if (data.usage.input_text_tokens) {
              // 豆包端到端语音模型格式
              logData.response.usage = {
                input_tokens: data.usage.input_text_tokens || 0,
                output_tokens: data.usage.output_text_tokens || 0,
                total_tokens: (data.usage.input_text_tokens || 0) + (data.usage.output_text_tokens || 0)
              };
            } else {
              // 其他格式
              logData.response.usage = {
                input_tokens: data.usage.input_tokens || 0,
                output_tokens: data.usage.output_tokens || 0,
                total_tokens: data.usage.total_tokens || 0
              };
            }
            logger.info(`Final usage data received: ${JSON.stringify(data.usage)}`);
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 写入日志
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    
    logger.info(`Log saved to: ${logFileName}, Usage: ${JSON.stringify(logData.response.usage)}`);
    
    // yield完整的助手消息（包含所有内容）
    yield new (await import('../../types/message.js')).AssistantMessage({
      role: 'assistant',
      content: assistantMessage.content,
      stop_reason: assistantMessage.stop_reason || 'end_turn'
    }, `doubao-${Date.now()}`);
    
    // yield用量统计信息
    yield {
      type: 'usage',
      usage: usage
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      logData.error = 'Request aborted';
      fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
      logger.info(`Request aborted: ${logId}`);
      throw error;
    }
    
    logData.error = error.message;
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    
    logger.error(`Doubao API error: ${error.message}`, error);
    throw error;
  }
}

/**
 * 格式化消息为 Doubao API 格式
 */
function formatMessages(messages, systemPrompt) {
  const formatted = [];
  
  // 添加系统提示词
  if (systemPrompt) {
    formatted.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  // 转换历史消息
  for (const msg of messages) {
    if (msg.type === 'user') {
      formatted.push({
        role: 'user',
        content: formatUserContent(msg.message.content)
      });
    } else if (msg.type === 'assistant') {
      formatted.push({
        role: 'assistant',
        content: formatAssistantContent(msg.message.content)
      });
    }
  }
  
  return formatted;
}

/**
 * 格式化用户消息内容
 */
function formatUserContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  
  // 处理工具结果
  const toolResults = content.filter(block => block.type === 'tool_result');
  if (toolResults.length > 0) {
    return toolResults.map(block => {
      if (block.is_error) {
        return `[Tool Error]: ${block.content}`;
      }
      return `[Tool Result]: ${block.content}`;
    }).join('\n');
  }
  
  // 处理普通文本
  const textBlocks = content.filter(block => block.type === 'text');
  return textBlocks.map(block => block.text).join('\n');
}

/**
 * 格式化助手消息内容
 */
function formatAssistantContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  
  return content.map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    }
    if (block.type === 'tool_use') {
      return {
        type: 'tool_use',
        id: block.id,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input)
        }
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * 格式化工具为 Doubao API 格式
 */
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
 * 验证 API Key
 */
export async function verifyApiKey(apiKey, isNonInteractiveSession = false) {
  if (isNonInteractiveSession) {
    return true;
  }
  
  try {
    const baseUrl = config.get('doubao.baseUrl') || 'https://ark.cn-beijing.volces.com/api/v3';
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    logger.error(`Failed to verify Doubao API key: ${error.message}`, error);
    return false;
  }
}
