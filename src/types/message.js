// Message types
export class Message {
  constructor(type, uuid) {
    this.type = type;
    this.uuid = uuid;
    this.timestamp = new Date().toISOString();
  }
}

export class AssistantMessage extends Message {
  constructor(message, uuid) {
    super('assistant', uuid);
    this.message = message;
  }
}

export class UserMessage extends Message {
  constructor(message, uuid) {
    super('user', uuid);
    this.message = message;
  }
}

export class SystemMessage extends Message {
  constructor(content, subtype, uuid) {
    super('system', uuid);
    this.content = content;
    this.subtype = subtype;
  }
}

export class ProgressMessage extends Message {
  constructor(content, uuid) {
    super('progress', uuid);
    this.content = content;
  }
}

export class AttachmentMessage extends Message {
  constructor(attachment, uuid) {
    super('attachment', uuid);
    this.attachment = attachment;
  }
}

export class StreamEvent {
  constructor(event) {
    this.type = 'stream_event';
    this.event = event;
  }
}

export class RequestStartEvent {
  constructor() {
    this.type = 'stream_request_start';
  }
}

export class TombstoneMessage extends Message {
  constructor(message, uuid) {
    super('tombstone', uuid);
    this.message = message;
  }
}

export class ToolUseSummaryMessage extends Message {
  constructor(summary, precedingToolUseIds, uuid) {
    super('tool_use_summary', uuid);
    this.summary = summary;
    this.precedingToolUseIds = precedingToolUseIds;
  }
}
