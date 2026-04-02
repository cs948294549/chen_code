// File Read Tool implementation
import { buildTool } from '../Tool.js';
import { FileOperations } from '../utils/operations/files/index.js';

export const ReadTool = buildTool({
  name: 'read_file',
  description: 'Read the content of a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read'
      }
    },
    required: ['path']
  },
  isConcurrencySafe: () => true,
  async call(input, toolUseContext) {
    try {
      const result = FileOperations.readFile(input.path);
      
      return {
        type: 'text',
        text: `Content of ${input.path}:\n\n${result.content}`
      };
    } catch (error) {
      return {
        type: 'text',
        text: `Error reading file ${input.path}: ${error.message}`,
        is_error: true
      };
    }
  }
});
