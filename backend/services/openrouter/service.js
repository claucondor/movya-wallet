const axios = require('axios');
const { OpenRouterModel } = require('./models');
const { WalletAssistantSystemPrompt } = require('./prompts');

class OpenRouterService {
  /**
   * @typedef {Object} Message
   * @property {'system' | 'user' | 'assistant'} role - The role of the message sender
   * @property {string} content - The content of the message
   */

  /**
   * @typedef {Object} OpenRouterConfig
   * @property {string} apiKey - The API key for OpenRouter
   * @property {string} model - The model to use
   * @property {string} [baseUrl] - The base URL for the API
   * @property {number} [temperature] - The temperature for generation
   * @property {number} [maxTokens] - The maximum number of tokens to generate
   * @property {string} [systemPrompt] - The system prompt to use
   */

  /**
   * @type {OpenRouterConfig}
   * @private
   */
  #config;

  /**
   * @type {Partial<OpenRouterConfig>}
   * @private
   */
  #defaultConfig = {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: OpenRouterModel.DEFAULT,
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: WalletAssistantSystemPrompt
  };

  /**
   * Creates an instance of OpenRouterService
   * @param {Partial<OpenRouterConfig>} config - The configuration object
   * @throws {Error} When API key is not provided
   */
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.#config = {
      ...this.#defaultConfig,
      ...config,
    };
  }

  /**
   * Sets the model to use
   * @param {string} model - The model identifier
   */
  setModel(model) {
    this.#config.model = model;
  }

  /**
   * Sets the system prompt
   * @param {string} prompt - The system prompt
   */
  setSystemPrompt(prompt) {
    this.#config.systemPrompt = prompt;
  }

  /**
   * Sets the temperature for generation
   * @param {number} temperature - The temperature value between 0 and 1
   * @throws {Error} When temperature is not between 0 and 1
   */
  setTemperature(temperature) {
    if (temperature < 0 || temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }
    this.#config.temperature = temperature;
  }

  /**
   * Sets the maximum number of tokens
   * @param {number} maxTokens - The maximum number of tokens
   */
  setMaxTokens(maxTokens) {
    this.#config.maxTokens = maxTokens;
  }

  /**
   * Builds the messages array for the API request
   * @param {string} userMessage - The user's message
   * @param {string} [overrideSystemPrompt] - Optional override for the system prompt
   * @returns {Message[]} The array of messages
   * @private
   */
  #buildMessages(userMessage, overrideSystemPrompt) {
    const messages = [];
    const systemPrompt = overrideSystemPrompt || this.#config.systemPrompt;
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * Makes a request to the OpenRouter API
   * @param {Object} request - The request object
   * @returns {Promise<Object>} The API response
   * @private
   */
  async #makeRequest(request) {
    try {
      const response = await axios.post(
        `${this.#config.baseUrl}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.#config.apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Sends a chat message and returns the response
   * @param {string} message - The message to send
   * @param {string} [systemPrompt] - Optional system prompt override for this specific call
   * @returns {Promise<string>} The response from the AI
   */
  async chat(message, systemPrompt) {
    const messages = this.#buildMessages(message, systemPrompt);
    
    const request = {
      messages,
      model: this.#config.model,
      temperature: this.#config.temperature,
      max_tokens: this.#config.maxTokens
    };

    const response = await this.#makeRequest(request);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Sends a chat message and streams the response
   * @param {string} message - The message to send
   * @param {function(string): void} onChunk - Callback for each chunk of the response
   * @param {string} [systemPrompt] - Optional system prompt override for this specific call
   * @returns {Promise<void>}
   */
  async streamChat(message, onChunk, systemPrompt) {
    const messages = this.#buildMessages(message, systemPrompt);
    
    const request = {
      messages,
      model: this.#config.model,
      temperature: this.#config.temperature,
      max_tokens: this.#config.maxTokens
    };
    
    try {
      const response = await axios.post(
        `${this.#config.baseUrl}/chat/completions`,
        {
          ...request,
          stream: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.#config.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.includes('[DONE]')) continue;
          
          try {
            const parsed = JSON.parse(line.replace('data: ', ''));
            const content = parsed.choices[0]?.delta?.content;
            if (content) onChunk(content);
          } catch (e) {
            console.error('Error parsing SSE chunk:', e);
          }
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }
}

module.exports = OpenRouterService; 