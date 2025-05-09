import { ActionResultSystemPrompt } from '../openrouter/ActionResultSystemPrompt';
import { WalletAssistantSystemPrompt } from '../openrouter/prompts';
import { OpenRouterService } from '../openrouter/service';
import RecipientResolver from './recipientResolver';

// Define interfaces for clarity
export interface AIResponse {
    action: 'SEND' | 'CHECK_BALANCE' | 'VIEW_HISTORY' | 'CLARIFY' | 'GREETING' | 'ERROR' | string; // Allow string for potential flexibility/errors
    parameters: {
        recipientEmail: string | null;
        recipientAddress: string | null;
        amount: number | string | null;
        currency: string | null;
    } | null;
    confirmationRequired: boolean;
    confirmationMessage: string | null;
    responseMessage: string;
}

export interface AgentServiceResponse {
    responseMessage: string;
    newState: AIResponse | null; // The state passed between turns is the AI's response structure
    actionDetails: {
        type: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY' | null;
        recipientAddress: string | null; // Explicitly allow null
        recipientEmail: string | null;   // Explicitly allow null
        amount: string | null;           // Explicitly allow null
        currency: string | null;         // Explicitly allow null
    } | null;
}

interface ActionResultInput {
    actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY';
    status: 'success' | 'failure';
    data: {
        transactionHash?: string;
        amountSent?: string;
        currencySent?: string;
        recipient?: string;
        balance?: string;
        history?: { date: string; type: 'sent' | 'received'; amount: string; recipientOrSender: string }[];
        errorCode?: string;
        errorMessage?: string;
    };
}

export class AgentService {
    private openRouterService: OpenRouterService;

    constructor(apiKey: string | undefined) {
        if (!apiKey) {
            throw new Error("OpenRouter API key is missing. Please set OPENROUTER_API_KEY environment variable.");
        }
        this.openRouterService = new OpenRouterService({ apiKey });
    }

    /**
     * Processes a user's message using the OpenRouter AI and prepares a response for the frontend.
     *
     * @param {string} currentUserMessage - The latest message from the user.
     * @param {AIResponse | null} currentState - The state object returned by the AI in the previous turn.
     * @param {string} userId - The ID of the user for resolving contacts and recipients.
     * @returns {Promise<AgentServiceResponse>}
     *          - responseMessage: The message to display to the user.
     *          - newState: The state object to be stored by the frontend for the next turn.
     *          - actionDetails: If an action needs frontend execution (e.g., SEND), this contains the parameters.
     */
    async processMessage(currentUserMessage: string, currentState: AIResponse | null, userId: string): Promise<AgentServiceResponse> {
        // Restore the check for empty messages *before* calling the AI
        if (!currentUserMessage) {
            console.log('Empty message received, returning predefined response.');
            return {
                responseMessage: "Please provide a message.",
                newState: currentState, // Keep previous state if any
                actionDetails: null
            };
        }

        console.log('Processing message with state:', { currentUserMessage, currentState });
        const inputJson = {
            currentUserMessage,
            currentState
        };

        try {
            // Call chat with user message and the specific system prompt
            const responseJsonString = await this.openRouterService.chat(
                JSON.stringify(inputJson), // User message is the JSON input
                WalletAssistantSystemPrompt // System prompt override
            );
            const aiResponse: AIResponse = JSON.parse(responseJsonString);
            console.log('AI Raw Response:', responseJsonString);
            console.log('AI Parsed Response:', aiResponse);

            // Si la acción es un envío y no requiere confirmación (listo para procesar)
            if (aiResponse.action === 'SEND' && !aiResponse.confirmationRequired && aiResponse.parameters) {
                // Resolver nickname/email a dirección de wallet si es necesario
                await this.resolveRecipient(aiResponse, userId);
            }

            let actionDetails: AgentServiceResponse['actionDetails'] = null;

            if (aiResponse.action === 'SEND' && !aiResponse.confirmationRequired && aiResponse.parameters) {
                actionDetails = {
                    type: 'SEND_TRANSACTION',
                    recipientAddress: aiResponse.parameters.recipientAddress,
                    recipientEmail: aiResponse.parameters.recipientEmail,
                    amount: aiResponse.parameters.amount !== null && aiResponse.parameters.amount !== undefined
                        ? String(aiResponse.parameters.amount)
                        : null,
                    currency: aiResponse.parameters.currency
                };
            } else if (aiResponse.action === 'CHECK_BALANCE') {
                actionDetails = { type: 'FETCH_BALANCE', recipientAddress: null, recipientEmail: null, amount: null, currency: null }; // Fill with nulls
            } else if (aiResponse.action === 'VIEW_HISTORY') {
                actionDetails = { type: 'FETCH_HISTORY', recipientAddress: null, recipientEmail: null, amount: null, currency: null }; // Fill with nulls
            }

            let finalResponseMessage = aiResponse.responseMessage;
            if (aiResponse.confirmationRequired && aiResponse.confirmationMessage) {
                finalResponseMessage = `${aiResponse.confirmationMessage}\n\n${aiResponse.responseMessage}`;
            }

            return {
                responseMessage: finalResponseMessage,
                newState: aiResponse,
                actionDetails: actionDetails
            };
        } catch (error) {
            console.error('Error processing message with OpenRouter:', error);
            return {
                responseMessage: "Sorry, I encountered an error trying to understand that. Please try again.",
                newState: null,
                actionDetails: null
            };
        }
    }

    /**
     * Resuelve el destinatario (nickname o email) a una dirección de wallet
     * @param aiResponse - Respuesta del AI para modificar
     * @param userId - ID del usuario para buscar contactos
     */
    private async resolveRecipient(aiResponse: AIResponse, userId: string): Promise<void> {
        if (!aiResponse.parameters) return;

        const recipientEmail = aiResponse.parameters.recipientEmail;
        const recipientAddress = aiResponse.parameters.recipientAddress;

        // Si ya tenemos una dirección y no un email, no hay nada que resolver
        if (recipientAddress && !recipientEmail) return;

        // Si tenemos un email, intentamos resolverlo a una dirección
        if (recipientEmail) {
            const resolved = await RecipientResolver.resolveRecipient(userId, recipientEmail);
            
            if (resolved.address) {
                // Si se pudo resolver, actualizamos los parámetros de la respuesta
                aiResponse.parameters.recipientAddress = resolved.address;
                // Mantenemos el email para referencia en los mensajes al usuario
            }
        } 
        // Si no tenemos ni dirección ni email (podría ser un nickname)
        else if (!recipientAddress && !recipientEmail) {
            // Buscamos en el mensaje del usuario alguna palabra que pueda ser un destinatario
            // Nota: Esto es una simplificación, en un caso real se necesitaría un análisis más sofisticado
            const words = aiResponse.responseMessage.split(/\s+/);
            
            for (const word of words) {
                // Ignorar palabras muy cortas y palabras comunes
                if (word.length < 3) continue;
                
                const resolved = await RecipientResolver.resolveRecipient(userId, word);
                
                if (resolved.address) {
                    aiResponse.parameters.recipientAddress = resolved.address;
                    
                    // Si era un nickname, añadimos un mensaje adicional
                    if (resolved.type === 'nickname') {
                        aiResponse.parameters.recipientEmail = resolved.originalValue; // Guardamos el nickname original
                    }
                    
                    break; // Terminamos la búsqueda si encontramos una coincidencia
                }
            }
        }
    }

    // New method to process action results and generate a response message
    async processActionResult(resultInput: ActionResultInput): Promise<{ responseMessage: string }> {
        console.log('Processing action result:', resultInput);
        const inputJsonString = JSON.stringify(resultInput);

        try {
            // Call chat with the result data and the ActionResultSystemPrompt
            const responseMessage = await this.openRouterService.chat(
                inputJsonString, // The user message is the JSON result data
                ActionResultSystemPrompt // Override system prompt
            );
            console.log('Action Result AI Response:', responseMessage);

            return {
                responseMessage: responseMessage.trim()
            };
        } catch (error) {
            console.error('Error processing action result with OpenRouter:', error);
            return {
                responseMessage: "I received the result of the action, but had trouble formulating a response. Please check the outcome manually if needed."
            };
        }
    }
} 