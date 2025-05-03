/**
 * Available models in OpenRouter
 * Using const enum for potential performance benefits in compiled JS,
 * though regular enum is also fine.
 */
export const enum OpenRouterModel {
  DEFAULT = 'google/gemini-2.0-flash-lite-001',
  HAIKU = 'anthropic/claude-3-haiku-20240307',
  SONNET = 'anthropic/claude-3-sonnet-20240229',
  GPT4 = 'openai/gpt-4-turbo-preview',
  MIXTRAL = 'mistralai/mixtral-8x7b-instruct',
} 