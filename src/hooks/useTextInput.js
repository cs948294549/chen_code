// 文本输入处理钩子

import { Cursor, pushToKillRing, getLastKill, recordYank, yankPop, resetKillAccumulation, resetYankState, updateYankLength } from '../utils/Cursor.js';
import { addToHistory, getHistoryUp, getHistoryDown, resetHistory } from '../history.js';

function useTextInput({ getValue, onChange, onSubmit, onExit, columns = 80 }) {
  let offset = 0;

  function setOffset(newOffset) {
    offset = newOffset;
  }

  function handleInput(char, key) {
    // 获取最新的 value 值
    const value = getValue();
    // 基于当前的 value 和 offset 创建新的 cursor 对象
    const cursor = Cursor.fromText(value, columns, offset);
    
    if (key.return) {
      // 处理回车键
      if (onSubmit) {
        onSubmit(value);
      }
      addToHistory(value);
      // 先更新 offset，再调用 onChange
      setOffset(0);
      onChange('');
    } else if (key.backspace || key.delete) {
      // 处理退格键和删除键
      const newCursor = key.backspace ? cursor.backspace() : cursor.del();
      // 先更新 offset，再调用 onChange
      setOffset(newCursor.offset);
      onChange(newCursor.text);
    } else if (key.left) {
      // 处理左箭头
      const newCursor = cursor.left();
      setOffset(newCursor.offset);
    } else if (key.right) {
      // 处理右箭头
      const newCursor = cursor.right();
      setOffset(newCursor.offset);
    } else if (key.up) {
      // 处理上箭头（历史记录）
      const historyValue = getHistoryUp(value);
      if (historyValue !== undefined) {
        // 先更新 offset，再调用 onChange
        setOffset(historyValue.length);
        onChange(historyValue);
      }
    } else if (key.down) {
      // 处理下箭头（历史记录）
      const historyValue = getHistoryDown(value);
      if (historyValue !== undefined) {
        // 先更新 offset，再调用 onChange
        setOffset(historyValue.length);
        onChange(historyValue);
      }
    } else if (key.ctrl && char === 'c') {
      // 处理 Ctrl+C
      if (value) {
        // 先更新 offset，再调用 onChange
        setOffset(0);
        onChange('');
        resetHistory();
      } else {
        if (onExit) {
          onExit();
        } else {
          process.exit(0);
        }
      }
    } else if (key.ctrl && char === 'd') {
      // 处理 Ctrl+D
      if (!value) {
        if (onExit) {
          onExit();
        } else {
          process.exit(0);
        }
      } else {
        const newCursor = cursor.del();
        // 先更新 offset，再调用 onChange
        setOffset(newCursor.offset);
        onChange(newCursor.text);
      }
    } else if (key.ctrl && char === 'k') {
      // 处理 Ctrl+K（删除到行尾）
      const { cursor: newCursor, killed } = cursor.deleteToLineEnd();
      pushToKillRing(killed, 'append');
      // 先更新 offset，再调用 onChange
      setOffset(newCursor.offset);
      onChange(newCursor.text);
    } else if (key.ctrl && char === 'u') {
      // 处理 Ctrl+U（删除到行首）
      const { cursor: newCursor, killed } = cursor.deleteToLineStart();
      pushToKillRing(killed, 'prepend');
      // 先更新 offset，再调用 onChange
      setOffset(newCursor.offset);
      onChange(newCursor.text);
    } else if (key.ctrl && char === 'w') {
      // 处理 Ctrl+W（删除前一个单词）
      const { cursor: newCursor, killed } = cursor.deleteWordBefore();
      pushToKillRing(killed, 'prepend');
      // 先更新 offset，再调用 onChange
      setOffset(newCursor.offset);
      onChange(newCursor.text);
    } else if (key.ctrl && char === 'y') {
      // 处理 Ctrl+Y（粘贴）
      const text = getLastKill();
      if (text) {
        const newCursor = cursor.insert(text);
        // 先更新 offset，再调用 onChange
        setOffset(newCursor.offset);
        onChange(newCursor.text);
        recordYank();
      }
    } else if (key.alt && char === 'y') {
      // 处理 Alt+Y（循环粘贴）
      const text = yankPop();
      if (text) {
        const newCursor = cursor.insert(text);
        // 先更新 offset，再调用 onChange
        setOffset(newCursor.offset);
        onChange(newCursor.text);
      }
    } else if (char) {
      // 处理普通字符输入
      const newCursor = cursor.insert(char);
      // 先更新 offset，再调用 onChange
      setOffset(newCursor.offset);
      onChange(newCursor.text);
    }
  }

  return {
    handleInput,
    get offset() {
      return offset;
    },
    setOffset
  };
}

export default useTextInput;