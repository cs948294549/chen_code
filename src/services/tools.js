// Tools registry
import { ExampleTool } from '../tools/ExampleTool.js';
import { ReadTool } from '../tools/ReadTool.js';
import { WriteTool } from '../tools/WriteTool.js';
import { TouchTool } from '../tools/TouchTool.js';

const tools = [];
const toolSources = {};

function registerTool(tool, source = 'builtin') {
  tools.push(tool);
  if (!toolSources[source]) {
    toolSources[source] = [];
  }
  toolSources[source].push(tool);
}

function registerToolSource(source, toolsList) {
  toolSources[source] = toolsList;
  for (const tool of toolsList) {
    if (!tools.find(t => t.name === tool.name)) {
      tools.push(tool);
    }
  }
}

function getTools() {
  return tools;
}

function findToolByName(name) {
  return tools.find(tool => tool.name === name);
}

function getToolsBySource(source) {
  return toolSources[source] || [];
}

function initTools() {
  registerTool(ExampleTool, 'builtin');
  registerTool(ReadTool, 'builtin');
  registerTool(WriteTool, 'builtin');
  registerTool(TouchTool, 'builtin');
}

initTools();

export {
  registerTool,
  registerToolSource,
  getTools,
  findToolByName,
  getToolsBySource
};
