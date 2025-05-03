import AgentService, { type AIResponse } from '@internal/agent/agentService';
import * as assert from 'assert';
import * as dotenv from 'dotenv';
import { before, describe, it } from 'mocha';

// Configurar dotenv para cargar variables de entorno
dotenv.config();

describe('AgentService', () => {
    let agentService: AgentService;

    before(() => {
        // Asegurarse de que tenemos la API key
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY is required in environment variables');
        }
        agentService = new AgentService(apiKey);
    });

    describe('processMessage', () => {
        it('should handle empty message', async () => {
            const response = await agentService.processMessage('', null);
            assert.strictEqual(response.responseMessage, 'Please provide a message.');
            assert.strictEqual(response.newState, null);
            assert.strictEqual(response.actionDetails, null);
        });

        it('should process a greeting message', async () => {
            const response = await agentService.processMessage('Hello', null);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            assert.strictEqual(response.actionDetails, null);
        });

        it('should handle balance check request', async () => {
            const response = await agentService.processMessage('What is my balance?', null);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            assert.ok(response.actionDetails);
            assert.strictEqual(response.actionDetails?.type, 'FETCH_BALANCE');
        });

        it('should handle transaction history request', async () => {
            const response = await agentService.processMessage('Show my transaction history', null);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            assert.ok(response.actionDetails);
            assert.strictEqual(response.actionDetails?.type, 'FETCH_HISTORY');
        });

        it('should handle send transaction request with confirmation', async () => {
            const response = await agentService.processMessage('Send 0.1 ETH to 0x123...', null);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            const state = response.newState as AIResponse;
            assert.strictEqual(state.action, 'SEND');
            assert.ok(state.confirmationRequired);
        });

        it('should handle send transaction confirmation', async () => {
            const previousState: AIResponse = {
                action: 'SEND',
                parameters: {
                    recipientAddress: '0x123...',
                    amount: '0.1',
                    currency: 'ETH'
                },
                confirmationRequired: true,
                responseMessage: 'Would you like to send 0.1 ETH to 0x123...?'
            };

            const response = await agentService.processMessage('Yes, confirm the transaction', previousState);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            assert.ok(response.actionDetails);
            assert.strictEqual(response.actionDetails?.type, 'SEND_TRANSACTION');
            assert.strictEqual(response.actionDetails?.amount, '0.1');
            assert.strictEqual(response.actionDetails?.currency, 'ETH');
            assert.strictEqual(response.actionDetails?.recipientAddress, '0x123...');
        });

        it('should handle transaction cancellation', async () => {
            const previousState: AIResponse = {
                action: 'SEND',
                parameters: {
                    recipientAddress: '0x123...',
                    amount: '0.1',
                    currency: 'ETH'
                },
                confirmationRequired: true,
                responseMessage: 'Would you like to send 0.1 ETH to 0x123...?'
            };

            const response = await agentService.processMessage('No, cancel the transaction', previousState);
            assert.ok(response.responseMessage);
            assert.ok(response.newState);
            assert.strictEqual(response.actionDetails, null);
        });
    });
}); 