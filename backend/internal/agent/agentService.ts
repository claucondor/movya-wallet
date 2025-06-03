import { ActionResultSystemPrompt } from '../openrouter/ActionResultSystemPrompt';
import { WalletAssistantSystemPrompt } from '../openrouter/prompts';
import { OpenRouterService } from '../openrouter/service';
import RecipientResolver from './recipientResolver';
import PriceService from '../services/priceService';

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
    userId?: string; // Añadir userId como campo opcional
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

            // Validate and enrich response with price information
            await this.validateAndEnrichResponse(aiResponse);

            // MODIFICACIÓN: Intentar resolver el destinatario incluso para acciones CLARIFY
            // si recipientEmail está presente pero recipientAddress no
            if (aiResponse.parameters && 
                aiResponse.parameters.recipientEmail && 
                !aiResponse.parameters.recipientAddress && 
                (aiResponse.action === 'SEND' || aiResponse.action === 'CLARIFY')) {
                
                console.log(`Attempting to resolve recipient from email/nickname: ${aiResponse.parameters.recipientEmail}`);
                await this.resolveRecipient(aiResponse, userId);
                
                // Si estamos en CLARIFY y pudimos resolver el destinatario,
                // podríamos considerar cambiar a SEND si tenemos todos los demás parámetros
                if (aiResponse.action === 'CLARIFY' && 
                    aiResponse.parameters.recipientAddress && 
                    aiResponse.parameters.amount && 
                    aiResponse.parameters.currency) {
                    
                    console.log(`Successfully resolved ${aiResponse.parameters.recipientEmail} to ${aiResponse.parameters.recipientAddress}. Upgrading action from CLARIFY to SEND.`);
                    
                    // Cambiar de CLARIFY a SEND con confirmación requerida
                    aiResponse.action = 'SEND';
                    aiResponse.confirmationRequired = true;
                    
                    // Actualizar los mensajes para reflejar el cambio
                    const originalRecipient = aiResponse.parameters.recipientEmail;
                    aiResponse.confirmationMessage = `¡Encontré a ${originalRecipient} en tus contactos! ¿Quieres enviar ${aiResponse.parameters.amount} ${aiResponse.parameters.currency} a ${originalRecipient} (${aiResponse.parameters.recipientAddress})?`;
                    aiResponse.responseMessage = `Por favor confirma los detalles para enviar ${aiResponse.parameters.amount} ${aiResponse.parameters.currency} a ${originalRecipient}.`;
                }
            }

            // El código existente para SEND sin confirmación requerida
            // (Esto podría ser redundante ahora para algunos casos, pero lo mantenemos como salvaguarda)
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
     * Validate currency support and enrich response with price information
     * @param aiResponse - AI response to validate and enrich
     */
    private async validateAndEnrichResponse(aiResponse: AIResponse): Promise<void> {
        if (!aiResponse.parameters) return;

        const { currency, amount } = aiResponse.parameters;

        // Validate currency support
        if (currency && !PriceService.isCurrencySupported(currency)) {
            console.log(`Unsupported currency detected: ${currency}`);
            aiResponse.action = 'ERROR';
            aiResponse.responseMessage = `Sorry, I only support AVAX and USDC transactions. ${currency} is not supported on this wallet.`;
            aiResponse.confirmationRequired = false;
            aiResponse.confirmationMessage = null;
            return;
        }

        // Add USD value information for clarity
        if (currency && amount && typeof amount === 'number' && aiResponse.action === 'SEND') {
            try {
                const usdValue = await PriceService.calculateUSDValue(currency, amount);
                const formattedAmount = PriceService.formatCurrencyAmount(amount, currency);
                const formattedUSD = PriceService.formatUSDAmount(usdValue);

                // Enrich confirmation message with USD equivalent
                if (aiResponse.confirmationRequired && aiResponse.confirmationMessage) {
                    aiResponse.confirmationMessage = aiResponse.confirmationMessage.replace(
                        new RegExp(`${amount}\\s*${currency}`, 'i'),
                        `${formattedAmount} (≈ ${formattedUSD})`
                    );
                }

                console.log(`[AgentService] Enriched ${formattedAmount} with USD value: ${formattedUSD}`);
            } catch (error) {
                console.warn(`[AgentService] Failed to calculate USD value for ${amount} ${currency}:`, error);
            }
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
        const { userId, ...inputData } = resultInput; // Extraer userId del input
        
        // Enrich the input data with USD information if it's a successful transaction
        if (resultInput.status === 'success' && 
            resultInput.actionType === 'SEND_TRANSACTION' && 
            resultInput.data.amountSent && 
            resultInput.data.currencySent) {
            
            try {
                const amount = parseFloat(resultInput.data.amountSent);
                const currency = resultInput.data.currencySent;
                
                if (!isNaN(amount) && PriceService.isCurrencySupported(currency)) {
                    const usdValue = await PriceService.calculateUSDValue(currency, amount);
                    const formattedUSD = PriceService.formatUSDAmount(usdValue);
                    
                    // Add USD information to the data
                    (inputData as any).data.usdValue = formattedUSD;
                    console.log(`[AgentService] Added USD value to action result: ${amount} ${currency} = ${formattedUSD}`);
                }
            } catch (error) {
                console.warn('[AgentService] Failed to calculate USD value for action result:', error);
            }
        }

        const inputJsonString = JSON.stringify(inputData);

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