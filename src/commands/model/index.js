// 模型切换命令
// 参考 claude-code/src/commands/model/index.ts 的架构设计

import serviceManager from '../../services/index.js';
import { config } from '../../config/index.js';

export default {
  name: 'model',
  description: 'View or switch AI provider and model',
  handler: async (args) => {
    const aiService = serviceManager.getService('ai');
    
    if (!aiService) {
      return 'AI service not initialized';
    }

    const availableProviders = aiService.getAvailableProviders();

    // 没有参数时，显示当前配置和所有可用选项
    if (args.length === 0) {
      const currentConfig = aiService.getConfig();
      let output = 'Current AI Configuration:\n';
      output += `  Provider: ${currentConfig.provider}\n`;
      output += `  Model: ${currentConfig.model}\n\n`;
      
      output += 'Available Providers:\n';
      for (const provider of availableProviders) {
        const isCurrent = provider.name === currentConfig.provider;
        output += `  ${isCurrent ? '→' : ' '} ${provider.displayName}\n`;
        output += `    Models: ${provider.models.join(', ')}\n`;
      }
      
      output += '\nUsage:\n';
      output += '  /model                    - Show current configuration\n';
      output += '  /model <provider>         - Switch to provider (claude|doubao)\n';
      output += '  /model <model-name>       - Switch to specific model\n';
      
      return output;
    }

    const arg = args[0].toLowerCase();
    
    // 检查是否是提供商名称
    const providerNames = availableProviders.map(p => p.name);
    if (providerNames.includes(arg)) {
      try {
        const result = aiService.switchProvider(arg);
        let output = `Provider switched to: ${result.provider}\n`;
        output += `Model: ${result.model}\n`;
        
        // 验证 API Key
        const hasApiKey = await aiService.verifyApiKey(arg);
        if (!hasApiKey) {
          output += `\n⚠️  Warning: API key for ${arg} is not configured.\n`;
          output += `Please add it to the config file: ${config.getConfigPath()}`;
        }
        
        return output;
      } catch (error) {
        return `Error switching provider: ${error.message}`;
      }
    }
    
    // 检查是否是模型名称
    for (const provider of availableProviders) {
      if (provider.models.includes(arg)) {
        aiService.setModel(arg);
        return `Model switched to: ${arg} (${provider.displayName})`;
      }
    }
    
    // 未知参数
    return `Unknown provider or model: ${arg}\nAvailable providers: ${providerNames.join(', ')}`;
  }
};
