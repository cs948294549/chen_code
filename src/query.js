// Query loop implementation
import { callModel } from './services/api/claude.js';
import { categorizeRetryableAPIError } from './services/api/errors.js';
import { findToolByName } from './Tool.js';
import { 
  AssistantMessage, 
  UserMessage, 
  SystemMessage, 
  ProgressMessage, 
  AttachmentMessage, 
  StreamEvent, 
  RequestStartEvent, 
  TombstoneMessage, 
  ToolUseSummaryMessage 
} from './types/message.js';

// Generate a UUID
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Production dependencies
export function productionDeps(customCallModel = null) {
  return {
    uuid,
    callModel: customCallModel || callModel,
    microcompact: async (messages, toolUseContext, querySource) => {
      // Placeholder implementation
      return { messages };
    },
    autocompact: async (messages, toolUseContext, options, querySource, tracking, snipTokensFreed) => {
      // Placeholder implementation
      return { compactionResult: null };
    }
  };
}

// Query parameters
export class QueryParams {
  constructor({
    messages,
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    toolUseContext,
    fallbackModel,
    querySource,
    maxTurns,
    taskBudget,
    deps
  }) {
    this.messages = messages;
    this.systemPrompt = systemPrompt;
    this.userContext = userContext;
    this.systemContext = systemContext;
    this.canUseTool = canUseTool;
    this.toolUseContext = toolUseContext;
    this.fallbackModel = fallbackModel;
    this.querySource = querySource;
    this.maxTurns = maxTurns;
    this.taskBudget = taskBudget;
    this.deps = deps || productionDeps();
  }
}

// Query loop state
class State {
  constructor({
    messages,
    toolUseContext,
    maxOutputTokensOverride,
    autoCompactTracking,
    stopHookActive,
    maxOutputTokensRecoveryCount,
    hasAttemptedReactiveCompact,
    turnCount,
    pendingToolUseSummary,
    transition
  }) {
    this.messages = messages;
    this.toolUseContext = toolUseContext;
    this.maxOutputTokensOverride = maxOutputTokensOverride;
    this.autoCompactTracking = autoCompactTracking;
    this.stopHookActive = stopHookActive;
    this.maxOutputTokensRecoveryCount = maxOutputTokensRecoveryCount;
    this.hasAttemptedReactiveCompact = hasAttemptedReactiveCompact;
    this.turnCount = turnCount;
    this.pendingToolUseSummary = pendingToolUseSummary;
    this.transition = transition;
  }
}

// Main query function
export async function* query(params) {
  const consumedCommandUuids = [];
  const terminal = yield* queryLoop(params, consumedCommandUuids);
  return terminal;
}

// Query loop
async function* queryLoop(params, consumedCommandUuids) {
  // Immutable params
  const {
    systemPrompt,
    userContext,
    systemContext,
    canUseTool,
    fallbackModel,
    querySource,
    maxTurns
  } = params;
  const deps = params.deps || productionDeps();

  // Mutable state
  let state = new State({
    messages: params.messages,
    toolUseContext: params.toolUseContext,
    maxOutputTokensOverride: undefined,
    autoCompactTracking: undefined,
    stopHookActive: undefined,
    maxOutputTokensRecoveryCount: 0,
    hasAttemptedReactiveCompact: false,
    turnCount: 1,
    pendingToolUseSummary: undefined,
    transition: undefined
  });

  // Main loop
  while (true) {
    // Destructure state
    let { toolUseContext } = state;
    const {
      messages,
      autoCompactTracking,
      maxOutputTokensRecoveryCount,
      hasAttemptedReactiveCompact,
      maxOutputTokensOverride,
      pendingToolUseSummary,
      stopHookActive,
      turnCount
    } = state;

    // Yield request start event
    yield new RequestStartEvent();

    // Initialize query tracking
    const queryTracking = toolUseContext.queryTracking
      ? {
          chainId: toolUseContext.queryTracking.chainId,
          depth: toolUseContext.queryTracking.depth + 1
        }
      : {
          chainId: deps.uuid(),
          depth: 0
        };

    toolUseContext = {
      ...toolUseContext,
      queryTracking
    };

    // Prepare messages for query
    let messagesForQuery = [...messages];

    // Apply microcompact
    const microcompactResult = await deps.microcompact(
      messagesForQuery,
      toolUseContext,
      querySource
    );
    messagesForQuery = microcompactResult.messages;

    // Apply autocompact
    const { compactionResult } = await deps.autocompact(
      messagesForQuery,
      toolUseContext,
      {
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        forkContextMessages: messagesForQuery
      },
      querySource,
      autoCompactTracking,
      0
    );

    if (compactionResult) {
      // Yield compaction messages
      for (const message of compactionResult.summaryMessages) {
        yield message;
      }
      messagesForQuery = compactionResult.summaryMessages;
    }

    // Update tool use context
    toolUseContext = {
      ...toolUseContext,
      messages: messagesForQuery
    };

    // Variables for tracking
    const assistantMessages = [];
    const toolResults = [];
    const toolUseBlocks = [];
    let needsFollowUp = false;

    // Call model
    try {
      for await (const message of deps.callModel({
        messages: messagesForQuery,
        systemPrompt,
        tools: toolUseContext.options.tools || [],
        signal: toolUseContext.abortController.signal,
        options: {
          model: toolUseContext.options.mainLoopModel,
          fallbackModel,
          isNonInteractiveSession: true,
          querySource
        }
      })) {
        yield message;

        if (message.type === 'assistant') {
          assistantMessages.push(message);

          // Check for tool use blocks
          const msgToolUseBlocks = message.message.content.filter(
            content => content.type === 'tool_use'
          );
          if (msgToolUseBlocks.length > 0) {
            toolUseBlocks.push(...msgToolUseBlocks);
            needsFollowUp = true;
          }
        }
      }
    } catch (error) {
      console.error('Error calling model:', error);
      yield new SystemMessage(
        error.message || 'An error occurred while calling the model',
        'api_error',
        deps.uuid()
      );
      return { reason: 'api_error' };
    }

    // Check if we need to follow up with tool execution
    if (needsFollowUp) {
      // Execute tools
      for (const toolBlock of toolUseBlocks) {
        const tool = findToolByName(toolUseContext.options.tools || [], toolBlock.name);
        if (tool) {
          try {
            // Check if we can use the tool
            const permission = await canUseTool(tool, toolBlock.input, toolUseContext);
            if (permission.behavior === 'allow') {
              // Execute the tool
              const result = await tool.execute(toolBlock.input);
              
              // Create tool result message
              const toolResultMessage = new UserMessage({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  content: result,
                  tool_use_id: toolBlock.id
                }]
              }, deps.uuid());
              
              yield toolResultMessage;
              toolResults.push(toolResultMessage);
            } else {
              // Tool use denied
              const toolResultMessage = new UserMessage({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  content: 'Tool use denied',
                  is_error: true,
                  tool_use_id: toolBlock.id
                }]
              }, deps.uuid());
              
              yield toolResultMessage;
              toolResults.push(toolResultMessage);
            }
          } catch (error) {
            console.error('Error executing tool:', error);
            const toolResultMessage = new UserMessage({
              role: 'user',
              content: [{
                type: 'tool_result',
                content: error.message || 'An error occurred while executing the tool',
                is_error: true,
                tool_use_id: toolBlock.id
              }]
            }, deps.uuid());
            
            yield toolResultMessage;
            toolResults.push(toolResultMessage);
          }
        }
      }

      // Continue the loop with tool results
      state = new State({
        messages: [...messages, ...assistantMessages, ...toolResults],
        toolUseContext,
        maxOutputTokensOverride,
        autoCompactTracking,
        stopHookActive,
        maxOutputTokensRecoveryCount,
        hasAttemptedReactiveCompact,
        turnCount: turnCount + 1,
        pendingToolUseSummary,
        transition: { type: 'tool_execution' }
      });
      continue;
    }

    // Check if we've reached max turns
    if (maxTurns && turnCount >= maxTurns) {
      yield new AttachmentMessage(
        {
          type: 'max_turns_reached',
          turnCount,
          maxTurns
        },
        deps.uuid()
      );
      return { reason: 'max_turns' };
    }

    // End of loop
    return { reason: 'completed' };
  }
}
