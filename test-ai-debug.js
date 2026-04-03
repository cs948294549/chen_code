import aiService from './src/services/ai.js';
import { logger } from './src/utils/logger.js';

async function testAIDebug() {
  console.log('='.repeat(80));
  console.log('AI Service 调试测试');
  console.log('='.repeat(80));

  try {
    console.log('\n1. 初始化 AI 服务...');
    aiService.init({
      provider: 'doubao',
      verbose: true
    });

    console.log('\n2. 检查工具列表...');
    const tools = aiService.getTools();
    console.log(`工具数量: ${tools.length}`);
    console.log('工具列表:');
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      console.log(`     描述: ${tool.description}`);
      console.log(`     参数: ${JSON.stringify(tool.inputSchema, null, 6)}`);
    });

    console.log('\n3. 发送测试消息...');
    const testPrompt = '帮我创建一个file2.txt 文件并写入hell';
    console.log(`测试消息: "${testPrompt}"`);
    console.log('\n对话内容:');
    console.log('-'.repeat(80));

    let messageCount = 0;
    for await (const message of aiService.sendMessage(testPrompt)) {
      messageCount++;
      console.log(`\n[消息 ${messageCount}] 类型: ${message.type}`);
      
      if (message.type === 'assistant' || message.type === 'user') {
        console.log('内容:');
        if (typeof message.message.content === 'string') {
          console.log(`  ${message.message.content}`);
        } else if (Array.isArray(message.message.content)) {
          message.message.content.forEach((block, i) => {
            console.log(`  [块 ${i}] 类型: ${block.type}`);
            if (block.type === 'text') {
              console.log(`    文本: ${block.text}`);
            } else if (block.type === 'tool_use') {
              console.log(`    工具名称: ${block.name}`);
              console.log(`    工具 ID: ${block.id}`);
              console.log(`    工具参数: ${JSON.stringify(block.input, null, 6)}`);
            } else if (block.type === 'tool_result') {
              console.log(`    工具 ID: ${block.tool_use_id}`);
              console.log(`    是否错误: ${block.is_error}`);
              console.log(`    结果内容: ${block.content}`);
            }
          });
        }
      } else {
        console.log(`内容: ${JSON.stringify(message, null, 2)}`);
      }
    }

    console.log('\n' + '-'.repeat(80));
    console.log(`\n4. 对话结束，共收到 ${messageCount} 条消息`);

    console.log('\n5. 消息历史:');
    const history = aiService.getMessages();
    console.log(`历史消息数: ${history.length}`);

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }

  console.log('\n' + '='.repeat(80));
  console.log('测试完成');
  console.log('='.repeat(80));
}

testAIDebug();
