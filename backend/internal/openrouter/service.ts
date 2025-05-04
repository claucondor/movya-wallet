import axios, { AxiosError } from 'axios';
import { OpenRouterModel } from './models'; // Assuming models.ts exists/will exist
import { WalletAssistantSystemPrompt } from './prompts'; // Assuming prompts.ts exists/will exist

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenRouterConfig {
    apiKey: string;
    model: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

// Interface for the expected structure of API error responses
interface OpenRouterErrorData {
    error?: string | { message?: string }; // Handle different error structures
    message?: string;
}

export class OpenRouterService {
    private config: Required<OpenRouterConfig>; // Use Required to ensure all defaults are set

    private static defaultConfig: Omit<Required<OpenRouterConfig>, 'apiKey'> = {
        baseUrl: 'https://openrouter.ai/api/v1',
        model: OpenRouterModel.DEFAULT,
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: WalletAssistantSystemPrompt,
    };

    constructor(config: Partial<OpenRouterConfig> & { apiKey: string }) {
        this.config = {
            ...OpenRouterService.defaultConfig,
            ...config,
        };
    }

    setModel(model: string): void {
        this.config.model = model;
    }

    setSystemPrompt(prompt: string): void {
        this.config.systemPrompt = prompt;
    }

    setTemperature(temperature: number): void {
        if (temperature < 0 || temperature > 1) {
            throw new Error('Temperature must be between 0 and 1');
        }
        this.config.temperature = temperature;
    }

    setMaxTokens(maxTokens: number): void {
        this.config.maxTokens = maxTokens;
    }

    private buildMessages(userMessage: string, overrideSystemPrompt?: string): Message[] {
        const messages: Message[] = [];
        const systemPrompt = overrideSystemPrompt || this.config.systemPrompt;

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: userMessage });

        return messages;
    }

    private async makeRequest(request: any): Promise<any> {
        try {
            const response = await axios.post(
                `${this.config.baseUrl}/chat/completions`,
                request,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
                        'X-Title': 'Movya Wallet' // Identify your application
                    },
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<OpenRouterErrorData>;
                const errorData = axiosError.response?.data;
                let errorMessage = axiosError.message;
                if (errorData) {
                     if (typeof errorData.error === 'string') {
                         errorMessage = errorData.error;
                     } else if (errorData.error?.message) {
                         errorMessage = errorData.error.message;
                     } else if (errorData.message) {
                         errorMessage = errorData.message;
                     }
                }
                console.error('OpenRouter API Error Details:', {
                    status: axiosError.response?.status,
                    data: errorData,
                    message: errorMessage,
                });
                throw new Error(`OpenRouter API error: ${errorMessage}`);
            }
            throw error;
        }
    }

    async chat(message: string, systemPrompt?: string): Promise<string> {
        const messages = this.buildMessages(message, systemPrompt);

        const request = {
            messages,
            model: this.config.model,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };

        const response = await this.makeRequest(request);
        const content = response.choices?.[0]?.message?.content || '';

        // Intentar limpiar el formato markdown si existe
        if (content.startsWith('```json') && content.endsWith('```')) {
            const jsonContent = content.slice(7, -3).trim(); // Elimina ```json y ```
            try {
                // Verificar que sea un JSON válido
                JSON.parse(jsonContent);
                return jsonContent;
            } catch (e) {
                // Si no es un JSON válido, devolver el contenido original
                return content;
            }
        }

        // Si no tiene formato markdown o la limpieza falló, devolver el contenido original
        return content;
    }

    async streamChat(
        message: string,
        onChunk: (chunk: string) => void,
        systemPrompt?: string
    ): Promise<void> {
        const messages = this.buildMessages(message, systemPrompt);

        const request = {
            messages,
            model: this.config.model,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };

        try {
            const response = await axios.post(
                `${this.config.baseUrl}/chat/completions`,
                {
                    ...request,
                    stream: true,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'stream',
                }
            );

            const stream = response.data as NodeJS.ReadableStream;

            for await (const chunk of stream) {
                const lines = chunk
                    .toString()
                    .split('\n')
                    .filter((line: string) => line.trim() !== '');

                for (const line of lines) {
                    if (line.includes('[DONE]')) continue;

                    try {
                        const parsed = JSON.parse(line.replace('data: ', ''));
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) onChunk(content);
                    } catch (e) {
                        console.error('Error parsing SSE chunk:', e);
                    }
                }
            }
        } catch (error) {
             if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<OpenRouterErrorData>;
                const errorData = axiosError.response?.data;
                let errorMessage = axiosError.message;
                if (errorData) {
                     if (typeof errorData.error === 'string') {
                         errorMessage = errorData.error;
                     } else if (errorData.error?.message) {
                         errorMessage = errorData.error.message;
                     } else if (errorData.message) {
                         errorMessage = errorData.message;
                     }
                }
                throw new Error(`OpenRouter API stream error: ${errorMessage}`);
            }
            throw error;
        }
    }
} 