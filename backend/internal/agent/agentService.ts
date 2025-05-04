import { ActionResultSystemPrompt } from '../openrouter/ActionResultSystemPrompt';
import { WalletAssistantSystemPrompt } from '../openrouter/prompts';
import { OpenRouterService } from '../openrouter/service';

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
     * @returns {Promise<AgentServiceResponse>}
     *          - responseMessage: The message to display to the user.
     *          - newState: The state object to be stored by the frontend for the next turn.
     *          - actionDetails: If an action needs frontend execution (e.g., SEND), this contains the parameters.
     */
    async processMessage(currentUserMessage: string, currentState: AIResponse | null): Promise<AgentServiceResponse> {
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