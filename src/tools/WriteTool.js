// File Write Tool implementation
import { buildTool } from '../Tool.js';
import { FileOperations } from '../utils/operations/files/index.js';

export const WriteTool = buildTool({
  name: 'write_file',
  description: 'Write content to a file. Must provide both path and content parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The file path, e.g. "file2.txt"'
      },
      content: {
        type: 'string',
        description: 'The text content to write to the file, e.g. "hell"'
      },
      append: {
        type: 'boolean',
        description: 'Whether to append to the file instead of overwriting (optional, default: false)',
        default: false
      }
    },
    required: ['path', 'content']
  },
  isConcurrencySafe: () => false,
  async call(input, toolUseContext) {
    try {
      if (!input || !input.path || !input.content) {
        return {
          type: 'text',
          text: 'Error: Missing required parameters (path and content)',
          is_error: true
        };
      }
      
      const result = FileOperations.writeFile(input.path, input.content, {
        append: input.append,
        addNewline: input.append
      });
      
      return {
        type: 'text',
        text: `Successfully ${result.operation === 'append' ? 'appended to' : 'wrote'} file: ${result.path}`
      };
    } catch (error) {
      const path = input?.path || 'undefined';
      return {
        type: 'text',
        text: `Error writing to file ${path}: ${error.message}`,
        is_error: true
      };
    }
  }
});
