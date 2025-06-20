import Constants from 'expo-constants';
import { AIResponse, ActionResultInput, AgentServiceResponse } from '../types/agent';
import { storage } from './storage';

// Retrieve backend URL (adjust based on your setup, e.g., environment variables)
const configuredUrl = Constants.expoConfig?.extra?.backendUrl;
console.log('[agentApi] Configuración del backend cargada:', {
    configExtra: Constants.expoConfig?.extra,
    backendUrl: configuredUrl
});

const BACKEND_URL = configuredUrl || 'http://localhost:8080';
console.log('[agentApi] Usando URL del backend:', BACKEND_URL);

/**
 * Sends a message to the AI agent chat endpoint.
 * @param message The user's message.
 * @param currentState The previous conversation state (if any).
 * @returns The agent's response.
 */
export const sendMessageToAgent = async (message: string, currentState: AIResponse | null): Promise<AgentServiceResponse> => {
    const token = storage.getString('userToken'); // Obtener el token si existe
    const userId = storage.getString('userId'); // Obtener el userId de storage

    console.log(`[agentApi] Sending message to ${BACKEND_URL}/agent/chat`);
    console.log('[agentApi] Current state being sent:', currentState);
    console.log('[agentApi] Using userId:', userId);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Añadir el token solo si existe
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('[agentApi] No authentication token found. Proceeding without it.');
    }

    try {
        const response = await fetch(`${BACKEND_URL}/agent/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                message, 
                currentState,
                userId: userId || undefined // Incluir el userId en el cuerpo si está disponible
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[agentApi] Error ${response.status} from /agent/chat:`, errorBody);
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data: AgentServiceResponse = await response.json();
        console.log('[agentApi] Received response from /agent/chat:', data);
        return data;
    } catch (error: any) {
        // Mejorar el mensaje de error para diagnóstico
        console.error(`[agentApi] Error de red al llamar a ${BACKEND_URL}/agent/chat:`, error.message || error);
        
        // Relanzar el error con información adicional
        throw error;
    }
};

/**
 * Reports the result of a frontend action to the AI agent with enriched interactive elements.
 * @param userMessage The original user message
 * @param actionResult The action execution result
 * @param originalResponse The original AI response
 * @returns Enhanced response with interactive elements
 */
export const reportEnrichedActionResult = async (
    userMessage: string,
    actionResult: any,
    originalResponse: AIResponse
): Promise<{ 
    responseMessage: string; 
    enrichedResponse?: { 
        quickActions?: any[]; 
        richContent?: any; 
        expectsResponse?: boolean; 
    } 
}> => {
    const token = storage.getString('userToken');
    const userId = storage.getString('userId');

    console.log(`[agentApi] Reporting enriched action result to ${BACKEND_URL}/agent/report_enriched_result`);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('[agentApi] No authentication token found. Proceeding without it.');
    }

    const response = await fetch(`${BACKEND_URL}/agent/report_enriched_result`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            userMessage,
            actionResult,
            originalResponse,
            userId: userId || undefined
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[agentApi] Error ${response.status} from /agent/report_enriched_result:`, errorBody);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log('[agentApi] Received enriched response from /agent/report_enriched_result:', data);
    return data;
};

/**
 * Reports the result of a frontend action to the AI agent.
 * @param resultData The structured result data.
 * @returns The agent's natural language response regarding the result.
 */
export const reportActionResult = async (resultData: ActionResultInput): Promise<{ responseMessage: string }> => {
    const token = storage.getString('userToken');
    const userId = storage.getString('userId'); // Obtener el userId de storage
    // Comentado para permitir llamadas sin token por ahora
    // if (!token) {
    //     throw new Error('Authentication token not found.');
    // }

    console.log(`[agentApi] Reporting action result to ${BACKEND_URL}/agent/report_result:`, resultData);
    console.log('[agentApi] Using userId:', userId);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Añadir el token solo si existe
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn('[agentApi] No authentication token found. Proceeding without it.');
    }

    const response = await fetch(`${BACKEND_URL}/agent/report_result`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            ...resultData,
            userId: userId || undefined // Incluir el userId en el cuerpo si está disponible
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[agentApi] Error ${response.status} from /agent/report_result:`, errorBody);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data: { responseMessage: string } = await response.json();
    console.log('[agentApi] Received response from /agent/report_result:', data);
    return data;
};

// Define more specific types for AIResponse and ActionResultInput if possible
// based on your backend implementation (e.g., backend/internal/agent/agentService.ts)
// Example for better typing:
/*
export interface AIResponse {
    action: 'SEND' | 'CHECK_BALANCE' | 'VIEW_HISTORY' | 'CLARIFY' | 'GREETING' | 'ERROR' | string;
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

export interface ActionResultInput {
    actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY';
    status: 'success' | 'failure';
    data: {
        transactionHash?: string;
        amountSent?: string;
        currencySent?: string;
        recipient?: string;
        balance?: string;
        history?: any[]; // Define history item structure
        errorCode?: string;
        errorMessage?: string;
    };
}
*/

// Add a default export to suppress Expo Router "missing default export" warning
export default function AgentApiExport() {
  return null; // This will never be rendered
} 