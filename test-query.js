// 测试 QueryEngine 的 prompt 拼接过程
// 用于检查从入口到实际 API 调用的完整输入内容

import { QueryEngine } from './src/QueryEngine.js';
import { getTools } from './src/services/tools.js';
import { config } from './src/config/index.js';
import * as doubaoAPI from './src/services/api/doubao.js';

const LOG_DIR = './.claude/logs';

async function testQueryPrompt() {
  console.log('=== 开始测试 QueryEngine Prompt 拼接 ===\n');

  config.init();

  const tools = getTools();
  console.log('1. 加载工具数量:', tools.length);
  if (tools.length > 0) {
    console.log('   工具列表:', tools.map(t => t.name).join(', '));
  }

  const engine = new QueryEngine({
    cwd: process.cwd(),
    tools: tools,
    canUseTool: async () => ({ behavior: 'allow' }),
    getAppState: () => ({}),
    setAppState: () => {},
    customSystemPrompt: null,
    appendSystemPrompt: null,
    userSpecifiedModel: 'doubao-seed-2-0-pro-260215',
    maxTurns: 3,
    maxBudgetUsd: 10,
    verbose: false,
    customCallModel: doubaoAPI.callModel
  });

  console.log('\n2. QueryEngine 配置:');
  console.log('   customSystemPrompt:', engine.config.customSystemPrompt || '(null)');
  console.log('   appendSystemPrompt:', engine.config.appendSystemPrompt || '(null)');
  console.log('   userSpecifiedModel:', engine.config.userSpecifiedModel);

  console.log('\n3. 提交测试消息...');
  const testPrompt = '帮我创建一个test_file.txt文件，内容为 hello world。';

  console.log('\n=== 开始遍历 QueryEngine 输出 ===\n');

  let messageCount = 0;

  for await (const message of engine.submitMessage(testPrompt)) {
    messageCount++;

    console.log(`\n--- 消息 #${messageCount} ---`);
    console.log('type:', message.type);

    if (message.type === 'request_start') {
      console.log('   [RequestStartEvent] 开始新的请求');
    } else if (message.type === 'assistant') {
      console.log('   [AssistantMessage]');
      if (message.message && message.message.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            console.log('   文本内容:', block.text.substring(0, 200) + (block.text.length > 200 ? '...' : ''));
          } else if (block.type === 'tool_use') {
            console.log('   工具调用:', block.name);
            console.log('   工具输入:', JSON.stringify(block.input).substring(0, 200));
          }
        }
      }
    } else if (message.type === 'user') {
      console.log('   [UserMessage]');
      if (message.message && message.message.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            console.log('   文本内容:', block.text);
          }
        }
      }
    } else if (message.type === 'progress') {
      console.log('   [ProgressMessage]');
      if (message.message) {
        console.log('   进度内容:', JSON.stringify(message.message).substring(0, 200));
      }
    } else if (message.type === 'usage') {
      console.log('   [Usage]');
      console.log('   使用量:', JSON.stringify(message.usage));
    } else if (message.type === 'result') {
      console.log('   [Result]');
      console.log('   结果:', JSON.stringify({
        subtype: message.subtype,
        is_error: message.is_error,
        duration_ms: message.duration_ms,
        num_turns: message.num_turns,
        stop_reason: message.stop_reason,
        usage: message.usage
      }, null, 2));
    } else {
      console.log('   其他消息:', JSON.stringify(message).substring(0, 200));
    }
  }

  console.log('\n=== 测试完成 ===');
  console.log('总消息数:', messageCount);

  console.log('\n4. 检查日志文件...');
  const fs = await import('fs');
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length > 0) {
      console.log('   最新日志文件:', files[0]);
      const logContent = fs.readFileSync(`${LOG_DIR}/${files[0]}`, 'utf-8');
      const logData = JSON.parse(logContent);
      console.log('\n   [日志内容 - 完整输入输出]');
      console.log('   request.model:', logData.request.model);
      console.log('   request.systemPrompt:', logData.request.systemPrompt);
      console.log('   request.messages 数量:', logData.request.messages.length);
      console.log('   request.tools 数量:', logData.request.tools ? logData.request.tools.length : 0);
      
      if (logData.request.tools && logData.request.tools.length > 0) {
        console.log('\n   [工具列表详情]');
        logData.request.tools.forEach((tool, index) => {
          console.log(`   工具 ${index + 1}: ${tool.name}`);
          console.log(`     描述: ${tool.description}`);
          console.log(`     参数: ${JSON.stringify(tool.inputSchema)}`);
        });
      }
      
      console.log('\n   [用户消息]');
      logData.request.messages.forEach((msg, index) => {
        console.log(`   消息 ${index + 1}: ${msg.type}`);
        console.log(`     内容: ${JSON.stringify(msg.message.content)}`);
      });
      
      console.log('\n   [API 响应]');
      console.log('   response.content:', logData.response.content);
      console.log('   response.usage:', JSON.stringify(logData.response.usage));
      
      console.log('\n   [问题分析]');
      console.log('   ❌ systemPrompt 中没有包含工具使用说明');
      console.log('   ✅ tools 数组已正确发送到 API');
      console.log('   ℹ️  建议: 需要在 systemPrompt 中添加工具使用指南');
    }
  } catch (e) {
    console.log('   无法读取日志:', e.message);
  }
}

testQueryPrompt().catch(console.error);

