import serviceManager from '../../services/index.js';

const aiCommand = {
  name: 'ai',
  description: 'Send a message to AI assistant',
  handler: async (args) => {
    // 获取 AI 服务
    const aiService = serviceManager.getService('ai');
    
    if (!aiService) {
      return '[Error]: AI service not initialized';
    }
    
    if (aiService.isBusy()) {
      return '[Error]: AI is currently processing another request';
    }
    
    // 组合参数为完整的提示词
    const prompt = args.join(' ');
    
    if (!prompt.trim()) {
      return '[Error]: Please provide a message for AI';
    }
    
    try {
      let result = '';
      
      // 调用 AI 服务
      for await (const message of aiService.sendMessage(prompt)) {
        if (message.type === 'assistant') {
          // 提取文本内容
          const content = message.message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');
          
          result += content;
        }
      }
      
      return result || '[Info]: AI returned empty response';
      
    } catch (error) {
      return `[Error]: ${error.message}`;
    }
  }
};

export default aiCommand;