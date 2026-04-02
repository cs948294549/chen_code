// Tool execution service
import { findToolByName } from '../Tool.js';
import { logger } from '../utils/logger.js';

export async function executeTool(tool, input, toolUseContext, canUseTool, assistantMessage, toolUseID) {
  try {
    logger.info(`Executing tool: ${tool.name}`);

    const permission = await canUseTool(tool, input, toolUseContext, assistantMessage, toolUseID);
    
    if (permission.behavior !== 'allow') {
      logger.info(`Tool ${tool.name} use denied`);
      return {
        type: 'error',
        content: 'Tool use denied',
        is_error: true
      };
    }

    const result = await tool.call(input, toolUseContext);
    
    logger.info(`Tool ${tool.name} executed successfully`);
    
    return result;
  } catch (error) {
    logger.error(`Error executing tool ${tool.name}:`, error);
    return {
      type: 'error',
      content: error.message || 'An error occurred while executing the tool',
      is_error: true
    };
  }
}

export async function runTools(toolUseBlocks, assistantMessages, canUseTool, toolUseContext, yieldMessage) {
  const toolResults = [];

  for (const toolBlock of toolUseBlocks) {
    const tool = findToolByName(toolUseContext.options.tools || [], toolBlock.name);
    
    if (!tool) {
      const errorResult = {
        type: 'error',
        content: `Tool ${toolBlock.name} not found`,
        is_error: true
      };
      toolResults.push({
        tool_use_id: toolBlock.id,
        result: errorResult
      });
      continue;
    }

    const assistantMessage = assistantMessages.find(msg => 
      msg.message.content.some(c => c.type === 'tool_use' && c.id === toolBlock.id)
    );

    const result = await executeTool(
      tool,
      toolBlock.input,
      toolUseContext,
      canUseTool,
      assistantMessage,
      toolBlock.id
    );

    toolResults.push({
      tool_use_id: toolBlock.id,
      result: result
    });
  }

  return toolResults;
}
