// API service for Claude
import { uuid } from '../../query.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

// 确保日志目录存在
const LOG_DIR = path.join(process.cwd(), '.claude', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export async function* callModel({ messages, systemPrompt, tools, signal, options }) {
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
    provider: 'claude',
    request: {
      model: options.model,
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

  // This is a placeholder implementation
  // In a real implementation, this would call the actual API
  logger.info(`Calling Claude model with: ${options.model}, messages: ${messages.length}, tools: ${tools.length}, logId: ${logId}`);

  try {
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Sample response content
    let assistantMessageContent;
    let stopReason = 'end_turn';

    // 检查是否需要模拟工具调用
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.message) {
      const content = lastMessage.message.content;
      if (typeof content !== 'string' && content.some(block => block.type === 'tool_result')) {
        // 如果有工具结果，返回最终回答
        assistantMessageContent = 'I have received the tool result. Let me analyze it for you.';
      } else if (tools.length > 0 && Math.random() > 0.5) {
        // 50%的概率模拟工具调用
        const tool = tools[0];
        assistantMessageContent = [
          {
            type: 'tool_use',
            id: 'tool_' + Date.now(),
            name: tool.name,
            input: tool.inputSchema?.required?.[0] ? { [tool.inputSchema.required[0]]: 'test' } : {}
          }
        ];
        stopReason = 'tool_use';
      } else {
        // 普通文本响应
        assistantMessageContent = 'Hello! I am Claude, an AI assistant. How can I help you today?';
      }
    } else {
      assistantMessageContent = 'Hello! I am Claude, an AI assistant. How can I help you today?';
    }

    // 格式化响应内容
    let formattedContent;
    if (typeof assistantMessageContent === 'string') {
      logData.response.content = assistantMessageContent;
      // 更新输出tokens
      logData.response.usage.output_tokens = assistantMessageContent.length;
      usage.output_tokens = assistantMessageContent.length;
      // 更新总tokens
      logData.response.usage.total_tokens = logData.response.usage.input_tokens + logData.response.usage.output_tokens;
      usage.total_tokens = logData.response.usage.total_tokens;
      
      formattedContent = [
        {
          type: 'text',
          text: assistantMessageContent
        }
      ];
    } else {
      formattedContent = assistantMessageContent;
      // 简单的token估算
      const toolUseText = JSON.stringify(assistantMessageContent);
      logData.response.content = toolUseText;
      logData.response.usage.output_tokens = toolUseText.length;
      usage.output_tokens = toolUseText.length;
      logData.response.usage.total_tokens = logData.response.usage.input_tokens + logData.response.usage.output_tokens;
      usage.total_tokens = logData.response.usage.total_tokens;
    }
    
    // 写入日志
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    
    logger.info(`Log saved to: ${logFileName}, Usage: ${JSON.stringify(logData.response.usage)}`);
    
    // yield完整的助手消息
    yield new (await import('../../types/message.js')).AssistantMessage({
      role: 'assistant',
      content: formattedContent,
      stop_reason: stopReason
    }, `claude-${Date.now()}`);
    
    // yield用量统计信息
    yield {
      type: 'usage',
      usage: usage
    };
  } catch (error) {
    logData.error = error.message;
    fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2));
    logger.error(`Claude API error: ${error.message}`, error);
    throw error;
  }
}

export function updateUsage(current, delta) {
  if (!delta) return current;
  return {
    input_tokens: (current.input_tokens || 0) + (delta.input_tokens || 0),
    output_tokens: (current.output_tokens || 0) + (delta.output_tokens || 0),
    total_tokens: (current.total_tokens || 0) + (delta.total_tokens || 0)
  };
}

export function accumulateUsage(total, current) {
  return {
    input_tokens: (total.input_tokens || 0) + (current.input_tokens || 0),
    output_tokens: (total.output_tokens || 0) + (current.output_tokens || 0),
    total_tokens: (total.total_tokens || 0) + (current.total_tokens || 0)
  };
}
