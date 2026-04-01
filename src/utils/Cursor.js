// 处理文本光标和编辑操作

class Cursor {
  constructor(text, columns, offset) {
    this.text = text;
    this.columns = columns;
    this.offset = offset;
  }

  static fromText(text, columns, offset) {
    return new Cursor(text, columns, offset);
  }

  // 移动光标到指定位置
  moveTo(offset) {
    const newOffset = Math.max(0, Math.min(offset, this.text.length));
    return new Cursor(this.text, this.columns, newOffset);
  }

  // 向左移动光标
  left() {
    return this.moveTo(this.offset - 1);
  }

  // 向右移动光标
  right() {
    return this.moveTo(this.offset + 1);
  }

  // 向上移动光标
  up() {
    // 简化实现，实际需要考虑换行
    return this;
  }

  // 向下移动光标
  down() {
    // 简化实现，实际需要考虑换行
    return this;
  }

  // 在光标位置插入文本
  insert(text) {
    const newText = this.text.slice(0, this.offset) + text + this.text.slice(this.offset);
    const newOffset = this.offset + text.length;
    return new Cursor(newText, this.columns, newOffset);
  }

  // 删除光标前的字符
  backspace() {
    if (this.offset === 0) {
      return this;
    }
    const newText = this.text.slice(0, this.offset - 1) + this.text.slice(this.offset);
    const newOffset = this.offset - 1;
    return new Cursor(newText, this.columns, newOffset);
  }

  // 删除光标后的字符
  del() {
    if (this.offset === this.text.length) {
      return this;
    }
    const newText = this.text.slice(0, this.offset) + this.text.slice(this.offset + 1);
    return new Cursor(newText, this.columns, this.offset);
  }

  // 删除到行尾
  deleteToLineEnd() {
    const newText = this.text.slice(0, this.offset);
    return {
      cursor: new Cursor(newText, this.columns, this.offset),
      killed: this.text.slice(this.offset)
    };
  }

  // 删除到行首
  deleteToLineStart() {
    const newText = this.text.slice(this.offset);
    return {
      cursor: new Cursor(newText, this.columns, 0),
      killed: this.text.slice(0, this.offset)
    };
  }

  // 删除光标前的单词
  deleteWordBefore() {
    let newOffset = this.offset;
    while (newOffset > 0 && /\s/.test(this.text[newOffset - 1])) {
      newOffset--;
    }
    while (newOffset > 0 && !/\s/.test(this.text[newOffset - 1])) {
      newOffset--;
    }
    const killed = this.text.slice(newOffset, this.offset);
    const newText = this.text.slice(0, newOffset) + this.text.slice(this.offset);
    return {
      cursor: new Cursor(newText, this.columns, newOffset),
      killed
    };
  }
}

// 剪贴板相关功能
let killRing = [];
let yankState = {
  index: 0,
  length: 0
};

function pushToKillRing(text, direction) {
  if (text) {
    if (direction === 'append' && killRing.length > 0) {
      killRing[0] += text;
    } else if (direction === 'prepend' && killRing.length > 0) {
      killRing[0] = text + killRing[0];
    } else {
      killRing.unshift(text);
      if (killRing.length > 10) {
        killRing.pop();
      }
    }
  }
}

function getLastKill() {
  return killRing[0] || '';
}

function recordYank() {
  yankState.index = 0;
  yankState.length = killRing.length;
}

function yankPop() {
  if (yankState.length > 0) {
    yankState.index = (yankState.index + 1) % yankState.length;
    return killRing[yankState.index] || '';
  }
  return '';
}

function resetKillAccumulation() {
  // 重置 kill 积累
}

function resetYankState() {
  yankState = {
    index: 0,
    length: 0
  };
}

function updateYankLength() {
  yankState.length = killRing.length;
}

module.exports = {
  Cursor,
  pushToKillRing,
  getLastKill,
  recordYank,
  yankPop,
  resetKillAccumulation,
  resetYankState,
  updateYankLength
};