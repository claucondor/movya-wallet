import { Request, Response } from 'express';
import { AgentService, AIResponse } from '../agent/agentService';

// Initialize AgentService with API key from environment
const agentService = new AgentService(process.env.OPENROUTER_API_KEY);

interface ChatRequest {
    message: string;
    currentState: AIResponse | null;
}

export const chatWithAgent = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request body
        const { message, currentState } = req.body as ChatRequest;
        
        if (!message) {
            res.status(400).json({
                error: 'Message is required'
            });
            return;
        }

        // Process message through agent service
        const response = await agentService.processMessage(message, currentState);

        // Return response
        res.status(200).json(response);

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: 'Internal server error processing message'
        });
    }
}; 