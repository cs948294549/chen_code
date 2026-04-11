// AI 服务模块 - 管理 QueryEngine 实例，支持多模型切换
// 参考 claude-code/src/services/api/claude.ts 的架构设计

import { QueryEngine } from '../QueryEngine.js';
import { getTools } from './tools.js';
import { config } from '../config/index.js';
import * as claudeAPI from './api/claude.js';
import * as doubaoAPI from './api/doubao.js';
import * as doubaoMock from './api/doubao-mock.js';
import { logger } from '../utils/logger.js';

class AIService {
  constructor() {
    this.engine = null;
    this.messages = [];
    this.isProcessing = false;
    this.currentAbortController = null;
    this.tools = [];
    this.config = {};
  }

  // 初始化 AI 服务
  init(options = {}) {
    // 从配置文件读取默认配置
    config.init();
    
    this.config = {
      provider: options.provider || config.getProvider() || 'defaultProvider',
      model: options.model || config.getModel() || 'claude-3-opus-20240229',
      maxTurns: options.maxTurns || config.get('settings.maxTurns', 10),
      maxBudgetUsd: options.maxBudgetUsd || config.get('settings.maxBudgetUsd', 10),
      ...options
    };

    // 初始化工具 - 从工具注册表获取
    this.tools = options.tools || getTools();
    
    const toolsCount = this.tools ? this.tools.length : 0;
    const toolNames = this.tools ? this.tools.map(t => t.name).join(', ') : 'none';
    logger.info(`AI Service initialized with ${toolsCount} tools: ${toolNames}`);

    // 创建 QueryEngine 实例
    this.createEngine();
  }

  // 创建 QueryEngine 实例
  createEngine() {
    // 根据提供商选择 API 调用函数
    const callModel = this.getProviderAPI();
    
    const toolsCount = this.tools ? this.tools.length : 0;
    const toolNames = this.tools ? this.tools.map(t => t.name).join(', ') : 'none';
    logger.info(`Creating QueryEngine with ${toolsCount} tools: ${toolNames}`);
    
    this.engine = new QueryEngine({
      tools: this.tools,
      canUseTool: this.canUseTool.bind(this),
      getAppState: () => ({}),
      setAppState: () => {},
      initialMessages: this.messages,
      userSpecifiedModel: this.config.model,
      maxTurns: this.config.maxTurns,
      maxBudgetUsd: this.config.maxBudgetUsd,
      verbose: false,
      // 注入提供商特定的 API 调用
      customCallModel: callModel
    });
    
    const engineToolsCount = this.engine.config.tools ? this.engine.config.tools.length : 0;
    const engineToolNames = this.engine.config.tools ? this.engine.config.tools.map(t => t.name).join(', ') : 'none';
    logger.info(`QueryEngine created. Engine config tools: ${engineToolsCount} tools: ${engineToolNames}`);
  }

  // 获取当前提供商的 API 调用函数
  getProviderAPI() {
    switch (this.config.provider) {
      case 'doubaoMock':
        return doubaoMock.callModel;
      case 'doubao':
        return doubaoAPI.callModel;
      case 'claude':
      default:
        return claudeAPI.callModel;
    }
  }

  // 获取当前提供商的名称
  getProvider() {
    return this.config.provider;
  }

  // 切换提供商
  switchProvider(provider) {
    if (this.isProcessing) {
      throw new Error('Cannot switch provider while processing');
    }
    
    if (provider !== 'claude' && provider !== 'doubao') {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    this.config.provider = provider;
    
    // 更新配置
    config.setProvider(provider);
    
    // 根据提供商设置默认模型
    const defaultModel = provider === 'doubao' 
      ? config.get('doubao.model', 'doubao-pro-32k')
      : config.get('claude.model', 'claude-3-opus-20240229');
    
    this.config.model = defaultModel;
    config.setModel(defaultModel);
    
    // 重新创建引擎
    this.createEngine();
    
    return {
      provider: this.config.provider,
      model: this.config.model
    };
  }

  // 工具权限检查
  async canUseTool(tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) {
    // 默认允许所有工具使用
    // 在实际应用中，这里可以实现权限控制逻辑
    return { behavior: 'allow' };
  }

  // 发送消息并获取响应
  async *sendMessage(prompt, options = {}) {
    if (this.isProcessing) {
      throw new Error('Already processing a message');
    }

    this.isProcessing = true;
    this.currentAbortController = new AbortController();

    try {
      // 更新模型配置
      if (options.model) {
        this.engine.setModel(options.model);
      }

      // 发送消息
      for await (const message of this.engine.submitMessage(prompt, options)) {
        // 更新消息历史
        if (message.type === 'assistant' || message.type === 'user') {
          this.messages.push(message);
        }

        yield message;
      }
    } finally {
      this.isProcessing = false;
      this.currentAbortController = null;
    }
  }

  // 中断当前处理
  interrupt() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
  }

  // 获取消息历史
  getMessages() {
    return this.messages;
  }

  // 清空消息历史
  clearMessages() {
    this.messages = [];
    if (this.engine) {
      this.engine.mutableMessages = [];
    }
  }

  // 设置模型
  setModel(model) {
    this.config.model = model;
    config.setModel(model);
    if (this.engine) {
      this.engine.setModel(model);
    }
  }

  // 获取当前模型
  getModel() {
    return this.config.model;
  }

  // 获取当前配置
  getConfig() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      maxTurns: this.config.maxTurns,
      maxBudgetUsd: this.config.maxBudgetUsd
    };
  }

  // 添加工具
  addTool(tool) {
    this.tools.push(tool);
    if (this.engine) {
      this.engine.config.tools = this.tools;
    }
  }

  // 获取所有工具
  getTools() {
    return this.tools;
  }

  // 是否正在处理
  isBusy() {
    return this.isProcessing;
  }

  // 验证 API Key
  async verifyApiKey(provider) {
    const p = provider || this.config.provider;
    const providerConfig = config.getProviderConfig(p);
    
    if (!providerConfig.apiKey) {
      return false;
    }
    
    switch (p) {
      case 'doubao':
        return doubaoAPI.verifyApiKey(providerConfig.apiKey);
      case 'claude':
      default:
        // Claude 的验证暂时返回 true（placeholder）
        return true;
    }
  }

  // 获取提供商列表
  getAvailableProviders() {
    return [
      { name: 'claude', displayName: 'Claude (Anthropic)', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
      { name: 'doubao', displayName: 'Doubao (ByteDance)', models: ['doubao-pro-32k', 'doubao-lite-32k', 'doubao-pro-128k'] }
    ];
  }
}

// 导出单例
export default new AIService();
