import { ActionResultInput } from '../types/agent';
import { reportActionResult } from './agentApi';
import { storage } from './storage';
import fetchStacksBalance from './walletActions/fetchBalance';
import { sendTransaction } from './walletActions/sendTransaction';
import TransactionHistoryService from './services/transactionHistoryService';
import SwapService from './services/swapService';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Interface for the action handler parameters to support common configuration
 */
interface ActionHandlerParams {
  networkId?: 'mainnet' | 'testnet'; // Allow overriding which network to use
  privateKey?: string;               // Allow passing private key directly or retrieve from storage
}

/**
 * Get private key from storage
 */
function getPrivateKeyFromStorage(): string {
  const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
  if (!privateKey) {
    throw new Error('No private key found in storage.');
  }
  return privateKey;
}

// Stacks blockchain doesn't need a client - we use Hiro API directly via fetch

// Tipos de acciones disponibles
export type WalletActionType = 'FETCH_BALANCE' | 'SEND_TRANSACTION' | 'FETCH_HISTORY' | 'SWAP';

// Parámetros para las acciones
export interface WalletActionParams {
  recipientAddress: string | null;
  recipientEmail: string | null;
  amount: string | null;
  currency: string | null;
  fromCurrency?: string | null;
  toCurrency?: string | null;
}

// Resultado de las acciones
export interface WalletActionResult {
  success: boolean;
  responseMessage: string;
  data?: ActionResultInput;
}

/**
 * Manejador central de acciones del wallet
 * Este sistema permite agregar nuevas acciones del wallet de manera modular
 */
export async function handleWalletAction(
  actionType: WalletActionType,
  params: WalletActionParams
): Promise<WalletActionResult> {
  console.log(`[WalletActionHandler] Ejecutando acción: ${actionType}`);

  try {
    // Manejar diferentes tipos de acciones
    switch (actionType) {
      case 'FETCH_BALANCE':
        const result = await fetchStacksBalance();
        
        // Si no hay mensaje de respuesta (debería venir de la IA), agregar un fallback
        if (!result.responseMessage && result.success && result.data) {
          // Proporcionar un mensaje por defecto solo como fallback
          const balance = result.data.data.balance || 'desconocido';
          result.responseMessage = `Balance actual: ${balance}`;
        } else if (!result.responseMessage && !result.success) {
          // Mensaje de error por defecto como fallback
          result.responseMessage = "No se pudo obtener el balance en este momento.";
        }
        
        return result;
      
      case 'SEND_TRANSACTION':
        // Validamos los parámetros necesarios
        if (!params.recipientAddress) {
          throw new Error('La dirección del destinatario es requerida para enviar una transacción');
        }
        
        if (!params.amount) {
          throw new Error('El monto a enviar es requerido para la transacción');
        }
        
        // Llamar a la función de enviar transacción
        const txResult = await sendTransaction(
          params.recipientAddress,
          params.amount,
          (params.currency as 'STX' | 'sBTC' | 'USDA') || 'STX'
        );
        
        // Si la transacción fue exitosa, guardarla en el historial
        if (txResult.success && txResult.data?.data?.transactionHash) {
          try {
            const historyService = TransactionHistoryService.getInstance();
            historyService.addOutgoingTransaction(
              txResult.data.data.transactionHash,
              params.amount,
              (params.currency as 'STX' | 'sBTC' | 'USDA') || 'STX', // Default to STX if not specified
              params.recipientAddress,
              params.recipientEmail || undefined, // Use email as nickname if available
              undefined // USD value would need to be calculated separately
            );
            console.log('[WalletActionHandler] Transaction added to history');
          } catch (historyError) {
            console.error('[WalletActionHandler] Error adding transaction to history:', historyError);
            // Don't fail the transaction if history fails
          }
        }
        
        return txResult;
      
      case 'FETCH_HISTORY':
        const historyService = TransactionHistoryService.getInstance();
        const recentTransactions = await historyService.fetchTransactionHistory(20);

        // Convert transactions to the format expected by ActionResultInput
        const formattedHistory = recentTransactions
          .filter(tx => tx.type === 'sent' || tx.type === 'received') // Only sent/received
          .map(tx => ({
            date: new Date(tx.timestamp).toLocaleDateString(),
            type: tx.type as 'sent' | 'received',
            amount: `${tx.amount} ${tx.currency}`,
            recipientOrSender: tx.type === 'sent'
              ? (tx.recipient || 'Unknown')
              : (tx.sender || 'Unknown')
          }));

        return {
          success: true,
          responseMessage: `Found ${recentTransactions.length} recent transactions`,
          data: {
            actionType: 'FETCH_HISTORY',
            status: 'success',
            data: {
              history: formattedHistory
            }
          }
        };
      
      case 'SWAP':
        // Validamos los parámetros necesarios para swap
        if (!params.fromCurrency || !params.toCurrency) {
          throw new Error('fromCurrency y toCurrency son requeridos para el swap');
        }

        if (!params.amount) {
          throw new Error('El monto a intercambiar es requerido para el swap');
        }

        // Validar que sean tokens soportados en Stacks (STX, sBTC, USDA)
        const supportedTokens = ['STX', 'sBTC', 'USDA'];
        if (!supportedTokens.includes(params.fromCurrency.toUpperCase()) ||
            !supportedTokens.includes(params.toCurrency.toUpperCase())) {
          throw new Error('Solo se soportan swaps entre STX, sBTC y USDA');
        }
        
        try {
          // Get quote first to determine minimum output
          const quote = await SwapService.getSwapQuote(
            params.fromCurrency,
            params.toCurrency,
            params.amount,
            0.5 // 0.5% slippage
          );

          // Execute the swap
          const swapResult = await SwapService.executeSwap(
            params.fromCurrency,
            params.toCurrency,
            params.amount,
            quote.minimumReceived,
            0.5 // 0.5% slippage
          );
          
          if (swapResult.success) {
            return {
              success: true,
              responseMessage: `Swap exitoso: ${swapResult.amountIn} ${swapResult.fromToken} intercambiado por ${swapResult.amountOut} ${swapResult.toToken}`,
              data: {
                actionType: 'SWAP',
                status: 'success',
                data: {
                  transactionHash: swapResult.transactionHash,
                  fromAmount: swapResult.amountIn,
                  fromToken: swapResult.fromToken,
                  toAmount: swapResult.amountOut,
                  toToken: swapResult.toToken,
                  gasUsed: swapResult.gasUsed?.toString()
                }
              }
            };
          } else {
            throw new Error(swapResult.error || 'Error desconocido en el swap');
          }
        } catch (swapError: any) {
          throw new Error(`Error ejecutando swap: ${swapError.message}`);
        }
      
      default:
        throw new Error(`Tipo de acción desconocida: ${actionType}`);
    }
  } catch (error: any) {
    console.error(`[WalletActionHandler] Error en la acción ${actionType}:`, error);
    
    // Retornar un formato consistente en caso de error
    return {
      success: false,
      responseMessage: `Error al procesar la solicitud: ${error.message}`, 
    };
  }
}

/**
 * Función para reportar el resultado de la acción al agente IA
 * y obtener una respuesta natural para el usuario
 */
export async function reportActionResultToAgent(
  actionResult: ActionResultInput
): Promise<string> {
  try {
    console.log('[WalletActionHandler] Reportando resultado al agente:', actionResult);

    // Usar la función existente para reportar el resultado
    const response = await reportActionResult(actionResult);
    return response.responseMessage;
  } catch (error: any) {
    console.error('[WalletActionHandler] Error al reportar resultado:', error);
    return `No pude obtener la respuesta del asistente. ${error.message || 'Error desconocido'}`;
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function WalletActionHandlerExport() {
  return null; // This will never be rendered
} 