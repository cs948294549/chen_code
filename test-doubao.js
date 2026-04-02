// 测试豆包API调用
import { callModel } from './src/services/api/doubao.js';

async function testDoubao() {
  try {
    console.log('Testing Doubao API...');
    
    const messages = [
      {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: '你好，你是谁？' }]
        }
      }
    ];
    
    console.log('Calling Doubao with messages:', messages);
    
    const generator = callModel({
      messages,
      systemPrompt: '你是豆包，一个智能AI助手。',
      tools: [],
      signal: null,
      options: {}
    });
    
    console.log('Response from Doubao:');
    for await (const message of generator) {
      if (message.type === 'assistant') {
        const content = message.message.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('');
        if (content) {
          process.stdout.write(content);
        }
      }
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing Doubao API:', error);
  }
}

testDoubao();
