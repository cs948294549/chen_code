// Test script to verify tool registration and AI service initialization
import { getTools } from './src/services/tools.js';
import serviceManager from './src/services/index.js';

async function test() {
  console.log('Testing tool registration...');
  const tools = getTools();
  console.log(`Number of tools: ${tools.length}`);
  console.log('Tools:', tools.map(t => ({ name: t.name, description: t.description })));

  console.log('\nTesting AI service initialization...');
  serviceManager.init();
  const aiService = serviceManager.getService('ai');
  console.log('AI service initialized:', !!aiService);
  
  if (aiService) {
    console.log('AI service tools:', aiService.tools ? aiService.tools.map(t => t.name) : 'none');
  }
}

test().catch(console.error);
