// Tool definition and utilities

export class Tool {
  constructor(options) {
    this.name = options.name;
    this.description = options.description;
    this.inputSchema = options.inputSchema || null;
    this.call = options.call;
    this.isConcurrencySafe = options.isConcurrencySafe || (() => false);
  }
}

export function buildTool(options) {
  const defaults = {
    isConcurrencySafe: () => false
  };
  return new Tool({ ...defaults, ...options });
}

export function findToolByName(tools, name) {
  return tools.find(tool => tool.name === name);
}

export function toolMatchesName(tool, name) {
  return tool.name === name;
}

export class ToolUseContext {
  constructor(options) {
    this.options = options || {};
    this.abortController = options.abortController || new AbortController();
    this.getAppState = options.getAppState || (() => ({}));
    this.setAppState = options.setAppState || (() => {});
    this.messages = options.messages || [];
    this.usage = options.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
    this._inProgressToolUseIDs = new Set();
  }

  setInProgressToolUseIDs(callback) {
    this._inProgressToolUseIDs = callback(this._inProgressToolUseIDs);
  }

  getInProgressToolUseIDs() {
    return this._inProgressToolUseIDs;
  }
}

export function createToolUseContext(options) {
  return new ToolUseContext(options);
}
