import { Request, Response } from 'express';
import { AgentService } from '../agent/agentService';

const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
if (!geminiApiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in environment variables.");
}

// Create a single AgentService instance
const agentService = new AgentService(geminiApiKey);

/**
 * Enhanced action result reporting that includes interactive elements
 */
export const reportEnrichedAgentResult = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[EnrichedResultController] Received request body:', req.body);

        const { userMessage, actionResult, originalResponse } = req.body;

        if (!userMessage || !actionResult || !originalResponse) {
            res.status(400).json({ 
                error: 'Missing required fields: userMessage, actionResult, and originalResponse are required' 
            });
            return;
        }

        console.log('[EnrichedResultController] Processing enriched action result with AgentService');
        const enrichedResponse = await agentService.processActionResultEnriched(
            userMessage,
            actionResult,
            originalResponse
        );

        console.log('[EnrichedResultController] AgentService returned:', enrichedResponse);

        res.json({
            responseMessage: enrichedResponse.responseMessage,
            enrichedResponse: {
                quickActions: enrichedResponse.quickActions,
                richContent: enrichedResponse.richContent,
                expectsResponse: enrichedResponse.expectsResponse
            }
        });

    } catch (error: any) {
        console.error('[EnrichedResultController] Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
}; 