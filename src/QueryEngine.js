// QueryEngine implementation
import { query, productionDeps } from './query.js';
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
import { createToolUseContext } from './Tool.js';
import { uuid } from './query.js';

// QueryEngine configuration
export class QueryEngineConfig {
  constructor({
    cwd,
    tools,
    commands,
    canUseTool,
    getAppState,
    setAppState,
    initialMessages,
    readFileCache,
    customSystemPrompt,
    appendSystemPrompt,
    userSpecifiedModel,
    fallbackModel,
    maxTurns,
    maxBudgetUsd,
    taskBudget,
    verbose,
    customCallModel
  }) {
    this.cwd = cwd;
    this.tools = tools || [];
    this.commands = commands || [];
    this.canUseTool = canUseTool || (async () => ({ behavior: 'allow' }));
    this.getAppState = getAppState || (() => ({}));
    this.setAppState = setAppState || (() => {});
    this.initialMessages = initialMessages || [];
    this.readFileCache = readFileCache || {};
    this.customSystemPrompt = customSystemPrompt;
    this.appendSystemPrompt = appendSystemPrompt;
    this.userSpecifiedModel = userSpecifiedModel;
    this.fallbackModel = fallbackModel;
    this.maxTurns = maxTurns;
    this.maxBudgetUsd = maxBudgetUsd;
    this.taskBudget = taskBudget;
    this.verbose = verbose || false;
    this.customCallModel = customCallModel || null;
  }
}

// QueryEngine class
export class QueryEngine {
  constructor(config) {
    this.config = new QueryEngineConfig(config);
    this.mutableMessages = config.initialMessages || [];
    this.abortController = new AbortController();
    this.permissionDenials = [];
    this.totalUsage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  }

  async *submitMessage(prompt, options = {}) {
    // 初始化开始时间
    this.startTime = Date.now();
    
    const {
      cwd,
      commands,
      tools,
      verbose,
      canUseTool,
      customSystemPrompt,
      appendSystemPrompt,
      userSpecifiedModel,
      fallbackModel,
      maxTurns,
      maxBudgetUsd,
      taskBudget,
      getAppState,
      setAppState
    } = this.config;

    // Wrap canUseTool to track permission denials
    const wrappedCanUseTool = async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
      const result = await canUseTool(
        tool,
        input,
        toolUseContext,
        assistantMessage,
        toolUseID,
        forceDecision
      );

      // Track denials
      if (result.behavior !== 'allow') {
        this.permissionDenials.push({
          tool_name: tool.name,
          tool_use_id: toolUseID,
          tool_input: input
        });
      }

      return result;
    };

    // Create user message
    const userMessage = new UserMessage({
      role: 'user',
      content: typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt
    }, options.uuid || uuid());

    // Add user message to messages
    this.mutableMessages.push(userMessage);

    // Create tool use context
    const toolUseContext = createToolUseContext({
      options: {
        commands,
        tools,
        verbose,
        mainLoopModel: userSpecifiedModel,
        thinkingConfig: { type: 'disabled' },
        mcpClients: [],
        isNonInteractiveSession: true,
        customSystemPrompt,
        appendSystemPrompt
      },
      getAppState,
      setAppState,
      abortController: this.abortController,
      messages: this.mutableMessages
    });

    // Prepare system prompt
    let systemPrompt = customSystemPrompt || 'You are Claude, an AI assistant.';
    if (appendSystemPrompt) {
      systemPrompt += '\n' + appendSystemPrompt;
    }

    // Prepare user and system context
    const userContext = {};
    const systemContext = {};

    // Start query loop
    const queryParams = {
      messages: this.mutableMessages,
      systemPrompt,
      userContext,
      systemContext,
      canUseTool: wrappedCanUseTool,
      toolUseContext,
      fallbackModel,
      querySource: 'sdk',
      maxTurns,
      taskBudget,
      deps: productionDeps(this.config.customCallModel)
    };

    // Process query results
    let usageFromAPI = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
    
    for await (const message of query(queryParams)) {
      // Update mutable messages
      if (message.type === 'assistant' || message.type === 'user' || message.type === 'progress') {
        this.mutableMessages.push(message);
      }

      // 捕获用量统计信息
      if (message.type === 'usage') {
        usageFromAPI = message.usage;
      }

      // Yield message to caller
      yield message;

      // Check if we need to stop due to budget constraints
      if (maxBudgetUsd) {
        // In a real implementation, we would check the actual cost
        // For now, we'll just simulate it
        const estimatedCost = (this.totalUsage.total_tokens / 1000) * 0.01; // $0.01 per 1000 tokens
        if (estimatedCost >= maxBudgetUsd) {
          yield new AttachmentMessage(
            {
              type: 'max_budget_reached',
              budget: maxBudgetUsd,
              estimatedCost
            },
            uuid()
          );
          return;
        }
      }
    }
    
    // Update total usage from API response
    if (usageFromAPI.input_tokens > 0 || usageFromAPI.output_tokens > 0) {
      this.totalUsage = usageFromAPI;
    }

    // Yield final result
    yield {
      type: 'result',
      subtype: 'success',
      is_error: false,
      duration_ms: Date.now() - this.startTime,
      num_turns: this.mutableMessages.filter(msg => msg.type === 'user').length,
      stop_reason: 'completed',
      usage: this.totalUsage,
      permission_denials: this.permissionDenials,
      uuid: uuid()
    };
  }

  interrupt() {
    this.abortController.abort();
  }

  getMessages() {
    return this.mutableMessages;
  }

  getReadFileState() {
    return this.config.readFileCache;
  }

  setModel(model) {
    this.config.userSpecifiedModel = model;
  }
}

// Convenience wrapper for one-shot usage
export async function* ask({ prompt, tools, canUseTool, ...options }) {
  const engine = new QueryEngine({
    tools: tools || [],
    canUseTool: canUseTool || (async () => ({ behavior: 'allow' })),
    ...options
  });

  yield* engine.submitMessage(prompt);
}
