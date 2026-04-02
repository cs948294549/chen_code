// File Write Tool implementation
import { buildTool } from '../Tool.js';
import { FileOperations } from '../utils/operations/files/index.js';

export const WriteTool = buildTool({
  name: 'write_file',
  description: 'Write content to a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to write'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file'
      },
      append: {
        type: 'boolean',
        description: 'Whether to append to the file instead of overwriting',
        default: false
      }
    },
    required: ['path', 'content']
  },
  isConcurrencySafe: () => false,
  async call(input, toolUseContext) {
    try {
      const result = FileOperations.writeFile(input.path, input.content, {
        append: input.append,
        addNewline: input.append
      });
      
      return {
        type: 'text',
        text: `Successfully ${result.operation === 'append' ? 'appended to' : 'wrote'} file: ${result.path}`
      };
    } catch (error) {
      return {
        type: 'text',
        text: `Error writing to file ${input.path}: ${error.message}`,
        is_error: true
      };
    }
  }
});
