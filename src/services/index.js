// 服务管理模块
import { createCronScheduler } from '../utils/cronScheduler.js';

class ServiceManager {
  constructor() {
    this.services = {};
  }

  // 初始化所有服务
  init(options = {}) {
    this.initCronScheduler(options.cronScheduler || {});
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

  // 停止所有服务
  stop() {
    if (this.services.cronScheduler) {
      this.services.cronScheduler.stop();
    }
  }

  // 获取服务
  getService(name) {
    return this.services[name];
  }
}

// 导出单例
export default new ServiceManager();
