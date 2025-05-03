const OpenRouterService = require('../openrouter/service');
const { WalletAssistantSystemPrompt } = require('../openrouter/prompts');
const models = require('../openrouter/models');

class AgentService {
    constructor(openRouterApiKey) {
        if (!openRouterApiKey) {
            throw new Error("OpenRouter API key is required for AgentService.");
        }
        // Initialize OpenRouter service here
        this.openRouterService = new OpenRouterService({
            apiKey: openRouterApiKey,
            model: models.CLAUDE_3_HAIKU, // Default model, can be configured
            temperature: 0.7,
            systemPrompt: WalletAssistantSystemPrompt
        });
    }

    /**
     * Processes a user's message using the OpenRouter AI and prepares a response for the frontend.
     *
     * @param {string} currentUserMessage - The latest message from the user.
     * @param {object | null} currentState - The state object returned by the AI in the previous turn.
     * @returns {Promise<{responseMessage: string, newState: object | null, actionDetails: object | null}>}
     *          - responseMessage: The message to display to the user.
     *          - newState: The state object to be stored by the frontend for the next turn.
     *          - actionDetails: If an action needs frontend execution (e.g., SEND), this contains the parameters.
     */
    async processMessage(currentUserMessage, currentState) {
        if (!currentUserMessage) {
            return {
                responseMessage: "Please provide a message.",
                newState: currentState,
                actionDetails: null
            };
        }

        try {
            const aiResponseString = await this.openRouterService.getCompletion(currentUserMessage, currentState);

            let aiResponse;
            try {
                // The AI should return *only* JSON, so parse it directly.
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
            let actionDetails = null;

            // Prepare response based on AI action
            switch (action) {
                case 'SEND':
                    if (confirmationRequired) {
                        // AI is asking for confirmation. Send confirmation message + response message.
                        // The frontend should display both and store the AI response as the new state.
                        frontendResponseMessage = confirmationMessage ? `${confirmationMessage}\n${responseMessage}` : responseMessage;
                    } else {
                        // User has confirmed (or AI determined no confirmation needed initially).
                        // Package parameters for frontend to execute the send transaction.
                        actionDetails = {
                            type: 'SEND_TRANSACTION',
                            recipientAddress: parameters.recipientAddress,
                            recipientEmail: parameters.recipientEmail, // Send email too, backend/frontend decides how to resolve
                            amount: parameters.amount,
                            currency: parameters.currency
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

        } catch (error) {
            console.error("Error processing message in AgentService:", error);
            return {
                responseMessage: "Sorry, I encountered an internal error. Please try again later.",
                newState: currentState, // Keep old state on error
                actionDetails: null
            };
        }
    }
}

module.exports = AgentService; 