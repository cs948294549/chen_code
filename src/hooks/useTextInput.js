// 文本输入处理钩子

const { Cursor, pushToKillRing, getLastKill, recordYank, yankPop, resetKillAccumulation, resetYankState, updateYankLength } = require('../utils/Cursor');
const { addToHistory, getHistoryUp, getHistoryDown, resetHistory } = require('../history');

function useTextInput({ value, onChange, onSubmit, onExit, columns = 80 }) {
  let offset = 0;
  let cursor = Cursor.fromText(value, columns, offset);

  function setOffset(newOffset) {
    offset = newOffset;
    cursor = Cursor.fromText(value, columns, offset);
  }

  function handleInput(char, key) {
    if (key.return) {
      // 处理回车键
      if (onSubmit) {
        onSubmit(value);
      }
      addToHistory(value);
      onChange('');
      setOffset(0);
    } else if (key.backspace || key.delete) {
      // 处理退格键和删除键
      const newCursor = key.backspace ? cursor.backspace() : cursor.del();
      onChange(newCursor.text);
      setOffset(newCursor.offset);
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
      onChange(historyValue);
      setOffset(historyValue.length);
    } else if (key.down) {
      // 处理下箭头（历史记录）
      const historyValue = getHistoryDown(value);
      onChange(historyValue);
      setOffset(historyValue.length);
    } else if (key.ctrl && char === 'c') {
      // 处理 Ctrl+C
      if (value) {
        onChange('');
        setOffset(0);
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
        onChange(newCursor.text);
        setOffset(newCursor.offset);
      }
    } else if (key.ctrl && char === 'k') {
      // 处理 Ctrl+K（删除到行尾）
      const { cursor: newCursor, killed } = cursor.deleteToLineEnd();
      pushToKillRing(killed, 'append');
      onChange(newCursor.text);
      setOffset(newCursor.offset);
    } else if (key.ctrl && char === 'u') {
      // 处理 Ctrl+U（删除到行首）
      const { cursor: newCursor, killed } = cursor.deleteToLineStart();
      pushToKillRing(killed, 'prepend');
      onChange(newCursor.text);
      setOffset(newCursor.offset);
    } else if (key.ctrl && char === 'w') {
      // 处理 Ctrl+W（删除前一个单词）
      const { cursor: newCursor, killed } = cursor.deleteWordBefore();
      pushToKillRing(killed, 'prepend');
      onChange(newCursor.text);
      setOffset(newCursor.offset);
    } else if (key.ctrl && char === 'y') {
      // 处理 Ctrl+Y（粘贴）
      const text = getLastKill();
      if (text) {
        const newCursor = cursor.insert(text);
        onChange(newCursor.text);
        setOffset(newCursor.offset);
        recordYank();
      }
    } else if (key.alt && char === 'y') {
      // 处理 Alt+Y（循环粘贴）
      const text = yankPop();
      if (text) {
        const newCursor = cursor.insert(text);
        onChange(newCursor.text);
        setOffset(newCursor.offset);
      }
    } else if (char) {
      // 处理普通字符输入
      const newCursor = cursor.insert(char);
      onChange(newCursor.text);
      setOffset(newCursor.offset);
    }
  }

  return {
    handleInput,
    offset,
    setOffset,
    cursor
  };
}

module.exports = useTextInput;