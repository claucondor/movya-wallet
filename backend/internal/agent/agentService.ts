import { OpenRouterModel, OpenRouterService, WalletAssistantSystemPrompt } from '@openrouter';

// Define interfaces for clarity
export interface AIResponse {
    action: 'SEND' | 'CHECK_BALANCE' | 'VIEW_HISTORY' | 'CLARIFY' | 'GREETING' | 'ERROR' | 'CONFIRM' | string; // Allow string for unhandled actions
    parameters: {
        recipientAddress?: string;
        recipientEmail?: string;
        amount?: number | string; // Amount could be string initially
        currency?: string;
    } | null;
    confirmationRequired?: boolean;
    confirmationMessage?: string;
    responseMessage: string;
}

export interface AgentServiceResponse {
    responseMessage: string;
    newState: AIResponse | null; // The state passed between turns is the AI's response structure
    actionDetails: {
        type: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY';
        recipientAddress?: string;
        recipientEmail?: string;
        amount?: number | string;
        currency?: string;
    } | null;
}

class AgentService {
    private openRouterService: OpenRouterService;

    constructor(openRouterApiKey: string | undefined) {
        if (!openRouterApiKey) {
            throw new Error("OpenRouter API key is required for AgentService.");
        }
        // Initialize OpenRouter service here
        this.openRouterService = new OpenRouterService({
            apiKey: openRouterApiKey,
            model: OpenRouterModel.DEFAULT, // Use the correct model reference
            temperature: 0.7,
            systemPrompt: WalletAssistantSystemPrompt
        });
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
        if (!currentUserMessage) {
            return {
                responseMessage: "Please provide a message.",
                newState: currentState,
                actionDetails: null
            };
        }

        try {
            // Format the input for the AI as per the system prompt requirements
            const aiInput = JSON.stringify({
                currentUserMessage,
                currentState
            });

            // Get AI response using the chat method
            const aiResponseString = await this.openRouterService.chat(aiInput);

            let aiResponse: AIResponse;
            try {
                // Parse the AI's JSON response
                aiResponse = JSON.parse(aiResponseString);
            } catch (parseError) {
                console.error("Failed to parse AI JSON response:", aiResponseString, parseError);
                // Fallback response if AI format is incorrect
                return {
                    responseMessage: "Sorry, I encountered an issue processing the response. Could you try rephrasing?",
                    newState: currentState, // Keep the old state on parse error
                    actionDetails: null
                };
            }

            const { action, parameters, confirmationRequired, confirmationMessage, responseMessage } = aiResponse;

            let frontendResponseMessage = responseMessage;
            let actionDetails: AgentServiceResponse['actionDetails'] = null; // Explicitly type actionDetails

            // Prepare response based on AI action
            switch (action) {
                case 'SEND':
                    if (confirmationRequired) {
                        // AI is asking for confirmation. Send confirmation message + response message.
                        // The frontend should display both and store the AI response as the new state.
                        frontendResponseMessage = confirmationMessage ? `${confirmationMessage}\\n${responseMessage}` : responseMessage;
                    } else {
                        // User has confirmed (or AI determined no confirmation needed initially).
                        // Package parameters for frontend to execute the send transaction.
                        actionDetails = {
                            type: 'SEND_TRANSACTION',
                            recipientAddress: parameters?.recipientAddress,
                            recipientEmail: parameters?.recipientEmail, // Send email too, backend/frontend decides how to resolve
                            amount: parameters?.amount,
                            currency: parameters?.currency
                        };
                        // Keep the AI's response message (e.g., "Great! Preparing the transaction...")
                    }
                    break;

                case 'CHECK_BALANCE':
                    // Signal frontend to fetch and display balance.
                    actionDetails = { type: 'FETCH_BALANCE' };
                    // Use the AI's response message (e.g., "Let me check your balance...")
                    break;

                case 'VIEW_HISTORY':
                    // Signal frontend to fetch and display transaction history.
                    actionDetails = { type: 'FETCH_HISTORY' };
                     // Use the AI's response message (e.g., "Looking up your recent transactions...")
                    break;

                case 'CLARIFY':
                case 'GREETING':
                case 'ERROR':
                case 'CONFIRM': // CONFIRM action is primarily for the AI's internal logic/state tracking
                    // Just display the AI's response message. Frontend stores the new state.
                    break;

                default:
                    console.warn(`Unhandled AI action type: ${action}`);
                    // Use default response message
                    break;
            }

            return {
                responseMessage: frontendResponseMessage,
                newState: aiResponse, // The entire AI response becomes the state for the next turn
                actionDetails: actionDetails
            };

        } catch (error: any) {
            console.error("Error processing message in AgentService:", error);
            return {
                responseMessage: "Sorry, I encountered an internal error. Please try again later.",
                newState: currentState, // Keep old state on error
                actionDetails: null
            };
        }
    }
}

export default AgentService; 