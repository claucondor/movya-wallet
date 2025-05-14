import { Request, Response } from 'express';
import { AgentService } from '../agent/agentService';

// Re-use the initialized AgentService instance (assuming it's a singleton or managed elsewhere)
// If not, initialize it here similarly to agentController.ts
const agentService = new AgentService(process.env.OPENROUTER_API_KEY);

// Define the expected input structure for the request body
// (Matches the ActionResultInput in AgentService)
interface ReportResultRequest {
    actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY';
    status: 'success' | 'failure';
    data: Record<string, any>; // Use a generic object for data, AgentService will handle specifics
}

export const reportAgentResult = async (req: Request, res: Response): Promise<void> => {
    try {
        const resultInput = req.body as ReportResultRequest;

        // Basic validation (can be enhanced)
        if (!resultInput || !resultInput.actionType || !resultInput.status || !resultInput.data) {
            res.status(400).json({
                error: 'Invalid request body. Required fields: actionType, status, data'
            });
            return;
        }

        // Obtener el ID del usuario autenticado
        // @ts-ignore - user se añade en el middleware de autenticación
        let userId = req.user?.googleUserId;

        // Permitir especificar un userId en el cuerpo
        if (!userId && req.body.userId) {
            console.log(`Using userId from request body: ${req.body.userId}`);
            userId = req.body.userId;
        }

        if (!userId) {
            console.warn('No user ID found in the request, using anonymous');
        }

        // Añadir el userId al contexto si está disponible (para futuros usos)
        const contextWithUser = {
            ...resultInput,
            userId: userId || 'anonymous'
        };

        // Process the result through the AgentService
        const response = await agentService.processActionResult(contextWithUser);

        // Return the generated response message
        res.status(200).json(response); // Sends back { responseMessage: "..." }

    } catch (error) {
        console.error('Error in reportAgentResult endpoint:', error);
        res.status(500).json({
            error: 'Internal server error processing action result'
        });
    }
}; 