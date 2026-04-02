// 重置对话历史命令
import serviceManager from '../../services/index.js';

export default {
  name: 'reset',
  description: 'Clear the AI conversation history',
  handler: async (args) => {
    const aiService = serviceManager.getService('ai');
    
    if (!aiService) {
      return 'AI service not initialized';
    }

    aiService.clearMessages();
    
    return 'Conversation history cleared';
  }
};
