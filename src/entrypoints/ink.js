import React from 'react';
import { render } from 'ink';
import App from '../ink/components/App.js';

function keepAlive() {
  // 保持程序运行
  setInterval(() => {}, 10000);
}

// 渲染应用
const { unmount } = render(React.createElement(App));

// 处理 SIGINT 信号
process.on('SIGINT', () => {
  unmount();
  process.exit(0);
});

// 保持程序运行
keepAlive();
