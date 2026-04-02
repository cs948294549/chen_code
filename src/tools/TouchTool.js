// File Touch Tool implementation
import { buildTool } from '../Tool.js';
import { FileOperations } from '../utils/operations/files/index.js';

export const TouchTool = buildTool({
  name: 'touch_file',
  description: 'Create a new file if it does not exist',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to create'
      }
    },
    required: ['path']
  },
  isConcurrencySafe: () => true,
  async call(input, toolUseContext) {
    try {
      const result = FileOperations.touchFile(input.path);
      
      if (result.created) {
        return {
          type: 'text',
          text: `Successfully created file: ${result.path}`
        };
      } else {
        return {
          type: 'text',
          text: `File already exists: ${result.path}`
        };
      }
    } catch (error) {
      return {
        type: 'text',
        text: `Error creating file ${input.path}: ${error.message}`,
        is_error: true
      };
    }
  }
});
