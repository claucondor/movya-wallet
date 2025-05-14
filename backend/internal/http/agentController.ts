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

        // Obtener el ID del usuario autenticado
        // @ts-ignore - user se añade en el middleware de autenticación
        let userId = req.user?.googleUserId;

        // MODIFICACIÓN TEMPORAL PARA PRUEBAS: Permitir especificar un userId en el cuerpo
        if (!userId && req.body.userId) {
            console.log(`Using userId from request body for testing: ${req.body.userId}`);
            userId = req.body.userId;
        }

        if (!userId) {
            console.warn('No user ID found in the request, nickname/email resolution will not work');
        }

        // Process message through agent service
        const response = await agentService.processMessage(
            message, 
            currentState, 
            userId || 'anonymous' // Usar un valor por defecto si no hay usuario
        );

        // Return response
        res.status(200).json(response);

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: 'Internal server error processing message'
        });
    }
}; 