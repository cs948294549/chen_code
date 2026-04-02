// API error handling
export const PROMPT_TOO_LONG_ERROR_MESSAGE = 'The prompt is too long. Please try to reduce the length of your message.';

export function isPromptTooLongMessage(message) {
  return message.includes('prompt too long') || message.includes('context length');
}

export function categorizeRetryableAPIError(error) {
  if (!error) return 'unknown';
  
  const errorMessage = error.message || '';
  
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'network';
  }
  
  if (isPromptTooLongMessage(errorMessage)) {
    return 'prompt_too_long';
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return 'rate_limit';
  }
  
  return 'unknown';
}
