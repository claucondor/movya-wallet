import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { WalletAssistantSystemPrompt } from '../openrouter/prompts';

// Define the structured output schema for the AI response
const aiResponseSchema: any = {
  type: SchemaType.OBJECT,
  properties: {
    action: {
      type: SchemaType.STRING,
      description: "The action type: SEND, CHECK_BALANCE, VIEW_HISTORY, SWAP, CLARIFY, GREETING, or ERROR",
      enum: ["SEND", "CHECK_BALANCE", "VIEW_HISTORY", "SWAP", "CLARIFY", "GREETING", "ERROR"]
    },
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipientEmail: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Recipient's email address or nickname"
        },
        recipientAddress: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Recipient's Stacks wallet address (SP... or ST...)"
        },
        amount: {
          type: SchemaType.NUMBER,
          nullable: true,
          description: "Amount to send"
        },
        currency: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Currency: STX, sBTC, or USDA",
          enum: ["STX", "sBTC", "USDA"]
        },
        fromCurrency: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Source currency for SWAP",
          enum: ["STX", "sBTC", "USDA"]
        },
        toCurrency: {
          type: SchemaType.STRING,
          nullable: true,
          description: "Target currency for SWAP",
          enum: ["STX", "sBTC", "USDA"]
        }
      },
      required: ["recipientEmail", "recipientAddress", "amount", "currency", "fromCurrency", "toCurrency"]
    },
    confirmationRequired: {
      type: SchemaType.BOOLEAN,
      description: "Whether user confirmation is needed"
    },
    confirmationMessage: {
      type: SchemaType.STRING,
      nullable: true,
      description: "Message asking for confirmation"
    },
    responseMessage: {
      type: SchemaType.STRING,
      description: "Natural language response to the user"
    }
  },
  required: ["action", "parameters", "confirmationRequired", "responseMessage"]
};

interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: Required<GeminiConfig>;

  private static defaultConfig = {
    model: 'gemini-2.5-flash-lite',
    temperature: 0.7,
    maxOutputTokens: 4096
  };

  constructor(config: GeminiConfig) {
    this.config = {
      ...GeminiService.defaultConfig,
      ...config
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);

    // Initialize model with structured output configuration
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: aiResponseSchema
      }
    });
  }

  async chat(userMessage: string, systemPrompt?: string): Promise<string> {
    try {
      const prompt = systemPrompt || WalletAssistantSystemPrompt;

      // Combine system prompt with user message
      const fullPrompt = `${prompt}\n\nUser Input:\n${userMessage}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      console.log('[GeminiService] Raw response:', text);

      return text;
    } catch (error: any) {
      console.error('[GeminiService] Error:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }
}
