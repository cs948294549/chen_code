// Example tool implementation
import { buildTool } from '../Tool.js';

export const ExampleTool = buildTool({
  name: 'example_tool',
  description: 'An example tool that returns a greeting',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name to greet'
      }
    },
    required: ['name']
  },
  isConcurrencySafe: () => true,
  async call(input, toolUseContext) {
    return {
      type: 'text',
      text: `Hello, ${input.name}! This is a response from the example tool.`
    };
  }
});
