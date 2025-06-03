import { avalanche, avalancheFuji } from '@/constants/chains';
import { createPublicClient, http } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../types/agent';
import { reportActionResult } from './agentApi';
import { storage } from './storage';
import { fetchAvaxBalance } from './walletActions/fetchBalance';
import { sendTransaction } from './walletActions/sendTransaction';
import TransactionHistoryService from './services/transactionHistoryService';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Interface for the action handler parameters to support common configuration
 */
interface ActionHandlerParams {
  networkId?: 'mainnet' | 'testnet'; // Allow overriding which network to use
  privateKey?: string;               // Allow passing private key directly or retrieve from storage
  account?: PrivateKeyAccount;       // Allow passing account directly
}

/**
 * Gets the current chain configuration based on preferences
 */
function getChain(networkId: 'mainnet' | 'testnet' = 'testnet') {
  return networkId === 'mainnet' ? avalanche : avalancheFuji;
}

/**
 * Load or create wallet account from storage or provided key
 */
async function getAccount(params?: ActionHandlerParams): Promise<PrivateKeyAccount> {
  if (params?.account) {
    return params.account;
  }

  try {
    const privateKey = params?.privateKey || storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No private key found in storage or provided.');
    }
    
    // Use non-dynamic import (was imported at the top of the file)
    return privateKeyToAccount(privateKey as `0x${string}`);
  } catch (error) {
    console.error('Failed to load account:', error);
    throw new Error('Could not load wallet account. Please check your wallet setup.');
  }
}

/**
 * Creates a public client for the specified network
 */
function createClient(networkId: 'mainnet' | 'testnet' = 'testnet') {
  const chain = getChain(networkId);
  return createPublicClient({
    chain,
    transport: http(), // Usar la configuración por defecto del chain que ya incluye fallbacks
  });
}

// Tipos de acciones disponibles
export type WalletActionType = 'FETCH_BALANCE' | 'SEND_TRANSACTION' | 'FETCH_HISTORY';

// Parámetros para las acciones
export interface WalletActionParams {
  recipientAddress: string | null;
  recipientEmail: string | null;
  amount: string | null;
  currency: string | null;
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
        const result = await fetchAvaxBalance();
        
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
          (params.currency as 'AVAX' | 'USDC') || 'AVAX'
        );
        
        // Si la transacción fue exitosa, guardarla en el historial
        if (txResult.success && txResult.data?.data?.transactionHash) {
          try {
            const historyService = TransactionHistoryService.getInstance();
            historyService.addOutgoingTransaction(
              txResult.data.data.transactionHash,
              params.amount,
              (params.currency as 'AVAX' | 'USDC') || 'AVAX', // Default to AVAX if not specified
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
        const recentTransactions = historyService.getRecentTransactions(20);
        
        // Convert transactions to the format expected by ActionResultInput (filter out pending)
        const formattedHistory = recentTransactions
          .filter(tx => tx.type !== 'pending') // Filter out pending transactions
          .map(tx => ({
            date: new Date(tx.timestamp).toLocaleDateString(),
            type: tx.type as 'sent' | 'received', // Now safe to cast
            amount: `${tx.amount} ${tx.currency}`,
            recipientOrSender: tx.type === 'sent' 
              ? (tx.recipientNickname || tx.recipient || 'Unknown')
              : (tx.senderNickname || tx.sender || 'Unknown')
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