// 配置管理模块
// 参考 claude-code/src/utils/config.ts 的架构设计

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const CONFIG_FILE_NAME = 'config.json';
const CONFIG_DIR = path.join(process.cwd(), '.claude');
const CONFIG_PATH = path.join(CONFIG_DIR, CONFIG_FILE_NAME);



// 默认配置
const DEFAULT_CONFIG = {
  // 当前使用的 AI 提供商
  ai: {
    provider: 'doubao', // 'claude' | 'doubao'
    model: 'doubao-seed-2-0-pro-260215'
  },
  
  // Claude 配置
  claude: {
    apiKey: '',
    baseUrl: '',
    model: 'claude-3-opus-20240229'
  },
  
  // Doubao (豆包) 配置
  doubao: {
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/',
    model: 'doubao-seed-2-0-pro-260215'
  },
  
  // 其他配置
  settings: {
    maxTurns: 10,
    maxBudgetUsd: 10,
    verbose: false
  }
};

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = CONFIG_PATH;
  }

  /**
   * 初始化配置
   */
  init() {
    this.ensureConfigDir();
    this.load();
  }

  /**
   * 确保配置目录存在
   */
  ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * 加载配置
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        this.config = this.mergeDeep(DEFAULT_CONFIG, userConfig);
      } else {
        this.config = { ...DEFAULT_CONFIG };
        this.save();
      }
    } catch (error) {
      console.error('Error loading config:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 保存配置
   */
  save() {
    try {
      this.ensureConfigDir();
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * 确保配置目录存在
   */
  ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }



  /**
   * 获取配置项
   * @param {string} key - 配置键，支持点号分隔的路径，如 'doubao.apiKey'
   * @param {*} defaultValue - 默认值
   */
  get(key, defaultValue = undefined) {
    if (!this.config) {
      this.init();
    }
    
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 设置配置项
   * @param {string} key - 配置键，支持点号分隔的路径
   * @param {*} value - 配置值
   */
  set(key, value) {
    if (!this.config) {
      this.init();
    }
    
    const keys = key.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
    this.save();
  }

  /**
   * 获取当前 AI 提供商
   */
  getProvider() {
    return this.get('ai.provider', 'claude');
  }

  /**
   * 设置当前 AI 提供商
   */
  setProvider(provider) {
    this.set('ai.provider', provider);
  }

  /**
   * 获取当前模型
   */
  getModel() {
    const provider = this.getProvider();
    return this.get(`ai.model`) || this.get(`${provider}.model`);
  }

  /**
   * 设置当前模型
   */
  setModel(model) {
    this.set('ai.model', model);
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(provider) {
    return {
      apiKey: this.get(`${provider}.apiKey`, ''),
      baseUrl: this.get(`${provider}.baseUrl`, ''),
      model: this.get(`${provider}.model`, '')
    };
  }

  /**
   * 深度合并对象
   */
  mergeDeep(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath() {
    return this.configPath;
  }

  /**
   * 获取完整配置
   */
  getAll() {
    return { ...this.config };
  }
}

/**
 * 检查是否为对象
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// 导出单例实例
export const config = new ConfigManager();

// 自动初始化配置
config.init();

export default config;
