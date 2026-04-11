// 测试 Doubao API 调用
// 检查完整的输入和输出内容

import aiService from './src/services/ai.js';

async function testDoubao() {
  console.log('=== 开始测试 Doubao API ===');
  
  try {
    // 1. 初始化 AI 服务，设置为使用 Doubao
    console.log('1. 初始化 AI 服务...');
    aiService.init({
      provider: 'doubao',
      model: 'doubao-seed-2-0-pro-260215'
    });
    
    console.log('   当前配置:', aiService.getConfig());
    
    // 2. 验证 API Key
    console.log('\n2. 验证 API Key...');
    const isApiKeyValid = await aiService.verifyApiKey('doubao');
    console.log('   API Key 验证结果:', isApiKeyValid ? '有效' : '无效');
    
    if (!isApiKeyValid) {
      console.log('   请在配置文件中设置有效的 Doubao API Key');
      return;
    }
    
    // 7. 测试工具调用
    console.log('\n7. 测试工具调用...');
    const toolTestPrompt = '帮我创建一个test_file.txt文件，内容为 hello world。';
    console.log('   输入:', toolTestPrompt);
    
    let toolResponse = '';
    let toolUsageInfo = null;
    
    for await (const message of aiService.sendMessage(toolTestPrompt)) {
      if (message.type === 'assistant') {
        if (message.message.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              console.log('   输出:', block.text);
              toolResponse += block.text;
            } else if (block.type === 'tool_use') {
              console.log('   工具调用:', block.name, block.input);
            }
          }
        }
      } else if (message.type === 'usage') {
        toolUsageInfo = message.usage;
      }
    }
    
    console.log('\n8. 工具调用结果:');
    console.log('   输入:', toolTestPrompt);
    console.log('   输出:', toolResponse);
    if (toolUsageInfo) {
      console.log('   使用量:', JSON.stringify(toolUsageInfo, null, 2));
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    // 清空消息历史
    aiService.clearMessages();
    console.log('\n=== 测试完成 ===');
  }
}

// 运行测试
testDoubao();
