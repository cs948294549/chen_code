// Test script to verify tool registration
import { config } from './src/config/index.js';

// 响应式接口类
class ChatCompletionsResponse {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async *stream(requestBody) {
    try {
      // 发起流式请求
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        const errorMessage = `Doubao API error: ${error.error?.message || response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      try {
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              // 忽略解析错误
              console.error('解析 JSON 失败:', e.message);
            }
          }
        }
      } catch (e) {
        console.error('解码错误:', e.message);
      }
    }

    // 处理最后可能的不完整行
    if (buffer.trim()) {
      try {
        if (buffer.startsWith('data: ')) {
          const data = JSON.parse(buffer.slice(6));
          yield data;
        }
      } catch (e) {
        // 忽略解析错误
        console.error('解析最后一行 JSON 失败:', e.message);
      }
    }
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }

  async complete(requestBody) {
    try {
      // 发起非流式请求
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ ...requestBody, stream: false })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        const errorMessage = `Doubao API error: ${error.error?.message || response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }
}

async function testQueryPrompt() {
  console.log('=== 开始测试 单次请求 ===\n');
  
  // 构建请求体
  let requestBody = {
    "model": "doubao-seed-2-0-pro-260215",
    "messages": [
      {
        "role": "user",
        "content": "帮我向test_file.txt文件新增写入内容，内容为 hello world。"
      }
    ],
    "stream": true,
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "write_file",
          "description": "Write content to a file. Must provide both path and content parameters.",
          "parameters": {
            "type": "object",
            "properties": {
              "path": {
                "type": "string",
                "description": "The file path, e.g. \"file2.txt\""
              },
              "content": {
                "type": "string",
                "description": "The text content to write to the file, e.g. \"hell\""
              },
              "append": {
                "type": "boolean",
                "description": "Whether to append to the file instead of overwriting (optional, default: false)",
                "default": false
              }
            },
            "required": [
              "path",
              "content"
            ]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "touch_file",
          "description": "Create a new file if it does not exist. Must provide the path parameter.",
          "parameters": {
            "type": "object",
            "properties": {
              "path": {
                "type": "string",
                "description": "The file path, e.g. \"file2.txt\""
              }
            },
            "required": [
              "path"
            ]
          }
        }
      }
    ],
    "tool_choice": "auto",
    // "thinking": { "type": "disabled" },
    // "reasoning": { "effort": "minimal" }
  };

  // 初始化响应式接口
  let baseUrl = config.get('doubao.baseUrl') || 'https://ark.cn-beijing.volces.com/api/v3';
  let apiKey = config.get('doubao.apiKey') || '';
  const chatResponse = new ChatCompletionsResponse(baseUrl, apiKey);

  console.log('=== 测试流式响应 ===');
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
  try {
    // 使用流式响应接口
    for await (const data of chatResponse.stream(requestBody)) {
      const delta = data.choices?.[0]?.delta;
      console.log("=-=-=-=-=", delta);

      // 处理文本内容
      if (delta?.content) {
        contentBuffer += delta.content;
      }
      
      // 处理推理内容
      if (delta?.reasoning_content) {
        reasonBuffer += delta.reasoning_content;
      }
      
      // 处理工具调用
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
            if(toolCall?.function) {
                const functionObj = toolCall.function;
                if(functionObj?.name) {
                    toolCallBuffer.name = functionObj.name;
                }
                if(functionObj?.arguments) {
                    toolCallBuffer.arguments += functionObj.arguments;
                }
            }
        }
      }
      
      // 检查是否完成
      if (data.choices?.[0]?.finish_reason) {
        console.log("finish_reason=", data.choices[0].finish_reason);
        assistantMessage.stop_reason = data.choices[0].finish_reason === 'tool_calls' 
          ? 'tool_use' 
          : 'end_turn';
      }
    }

    assistantMessage.content = contentBuffer;
    assistantMessage.reason = reasonBuffer;
    assistantMessage.tool_calls = [JSON.parse(toolCallBuffer.arguments)];

    console.log('\n=== 响应完成 ===');
    console.log('助手消息:', JSON.stringify(assistantMessage, null, 2));

  } catch (error) {
    console.error('流式请求失败:', error);
  }

  // 测试非流式响应
//   console.log('\n=== 测试非流式响应 ===');
//   try {
//     const result = await chatResponse.complete(requestBody);
//     console.log('非流式响应:', JSON.stringify(result, null, 2));
    
//     // 处理非流式响应中的工具调用
//     if (result.choices?.[0]?.message?.tool_calls) {
//       console.log('\n=== 工具调用解析 ===');
//       for (const toolCall of result.choices[0].message.tool_calls) {
//         console.log('工具名称:', toolCall.function.name);
//         console.log('工具参数:', JSON.parse(toolCall.function.arguments || '{}'));
//       }
//     }
//   } catch (error) {
//     console.error('非流式请求失败:', error);
//   }
}

testQueryPrompt().catch(console.error);
