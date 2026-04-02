// 服务管理模块
import { createCronScheduler } from '../utils/cronScheduler.js';
import aiService from './ai.js';

class ServiceManager {
  constructor() {
    this.services = {};
  }

  // 初始化所有服务
  init(options = {}) {
    this.initCronScheduler(options.cronScheduler || {});
    this.initAIService(options.ai || {});
  }

  // 初始化定时任务调度器
  initCronScheduler(options = {}) {
    this.services.cronScheduler = createCronScheduler({
      onFire: options.onFire || ((prompt) => {
        console.log('\n=== Scheduled Task Fired ===');
        console.log(prompt);
        console.log('============================\n');
      }),
      isLoading: options.isLoading || (() => false)
    });
    this.services.cronScheduler.start();
  }

  // 初始化 AI 服务
  initAIService(options = {}) {
    aiService.init(options);
    this.services.ai = aiService;
  }

  // 停止所有服务
  stop() {
    if (this.services.cronScheduler) {
      this.services.cronScheduler.stop();
    }
    if (this.services.ai) {
      this.services.ai.interrupt();
    }
  }

  // 获取服务
  getService(name) {
    return this.services[name];
  }
}

// 导出单例
export default new ServiceManager();
