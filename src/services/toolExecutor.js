// Tool execution service
import { findToolByName } from '../Tool.js';
import { logger } from '../utils/logger.js';
import { UserMessage } from '../types/message.js';
import { uuid } from '../query.js';

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

export async function* runTools(toolUseBlocks, assistantMessages, canUseTool, toolUseContext) {
  for (const toolBlock of toolUseBlocks) {
    // 跳过缺少名称的工具调用
    if (!toolBlock.name) {
      const errorResult = {
        type: 'text',
        text: 'Tool name is missing',
        is_error: true
      };
      
      const toolResultMessage = new UserMessage({
        role: 'user',
        content: [{
          type: 'tool_result',
          content: errorResult.text,
          is_error: true,
          tool_use_id: toolBlock.id
        }]
      }, uuid());
      
      yield {
        message: toolResultMessage,
        newContext: toolUseContext
      };
      continue;
    }
    
    const tool = findToolByName(toolUseContext.options.tools || [], toolBlock.name);
    
    if (!tool) {
      const errorResult = {
        type: 'text',
        text: `Tool ${toolBlock.name} not found`,
        is_error: true
      };
      
      const toolResultMessage = new UserMessage({
        role: 'user',
        content: [{
          type: 'tool_result',
          content: errorResult.text,
          is_error: true,
          tool_use_id: toolBlock.id
        }]
      }, uuid());
      
      yield {
        message: toolResultMessage,
        newContext: toolUseContext
      };
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

    const toolContent = result.text || result.content || JSON.stringify(result);
    
    const toolResultMessage = new UserMessage({
      role: 'user',
      content: [{
        type: 'tool_result',
        content: toolContent,
        is_error: result.is_error || false,
        tool_use_id: toolBlock.id
      }]
    }, uuid());
    
    yield {
      message: toolResultMessage,
      newContext: toolUseContext
    };
  }
}
