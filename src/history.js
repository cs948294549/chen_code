// 历史记录管理

let history = [];
let historyIndex = -1;

function addToHistory(input) {
  if (input.trim() !== '') {
    // 如果当前在历史记录中间，删除当前位置之后的记录
    if (historyIndex >= 0 && historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    // 添加新记录
    history.push(input);
    // 限制历史记录长度
    if (history.length > 100) {
      history.shift();
    }
    // 重置历史索引
    historyIndex = history.length;
  }
}

function getHistoryUp(currentInput) {
  if (history.length === 0) {
    return currentInput;
  }
  if (historyIndex === history.length) {
    // 保存当前输入
    historyIndex = history.length - 1;
  } else if (historyIndex > 0) {
    historyIndex--;
  }
  return history[historyIndex];
}

function getHistoryDown(currentInput) {
  if (history.length === 0 || historyIndex === history.length - 1) {
    historyIndex = history.length;
    return '';
  }
  historyIndex++;
  return history[historyIndex];
}

function resetHistory() {
  historyIndex = history.length;
}

function getHistory() {
  return history;
}

module.exports = {
  addToHistory,
  getHistoryUp,
  getHistoryDown,
  resetHistory,
  getHistory
};