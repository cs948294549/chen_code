// Query loop implementation
import { callModel } from './services/api/claude.js';
import { categorizeRetryableAPIError } from './services/api/errors.js';
import { findToolByName } from './Tool.js';
import { runTools } from './services/toolExecutor.js';
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
      return { messages };
    },
    autocompact: async (messages, toolUseContext, options, querySource, tracking, snipTokensFreed) => {
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

  let consecutiveErrorCount = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  while (true) {
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

    yield new RequestStartEvent();

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

    let messagesForQuery = [...messages];

    const microcompactResult = await deps.microcompact(
      messagesForQuery,
      toolUseContext,
      querySource
    );
    messagesForQuery = microcompactResult.messages;

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
      for (const message of compactionResult.summaryMessages) {
        yield message;
      }
      messagesForQuery = compactionResult.summaryMessages;
    }

    toolUseContext = {
      ...toolUseContext,
      messages: messagesForQuery
    };

    const assistantMessages = [];
    const toolResults = [];
    const toolUseBlocks = [];
    let needsFollowUp = false;

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

    if (needsFollowUp) {
      let updatedToolUseContext = toolUseContext;
      let hasErrorToolResult = false;
      
      for await (const update of runTools(toolUseBlocks, assistantMessages, canUseTool, toolUseContext)) {
        if (update.message) {
          yield update.message;
          toolResults.push(update.message);
          
          if (update.message.message && Array.isArray(update.message.message.content)) {
            const hasError = update.message.message.content.some(
              block => block.type === 'tool_result' && block.is_error
            );
            if (hasError) {
              hasErrorToolResult = true;
            }
          }
        }
        if (update.newContext) {
          updatedToolUseContext = update.newContext;
        }
      }

      if (hasErrorToolResult) {
        consecutiveErrorCount++;
        if (consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
          yield new SystemMessage(
            'Too many consecutive tool call errors. Stopping execution to avoid infinite loop.',
            'user_error',
            deps.uuid()
          );
          return { reason: 'max_consecutive_errors' };
        }
      } else {
        consecutiveErrorCount = 0;
      }

      state = new State({
        messages: [...messages, ...assistantMessages, ...toolResults],
        toolUseContext: updatedToolUseContext,
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

    return { reason: 'completed' };
  }
}
