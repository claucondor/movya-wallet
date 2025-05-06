import { avalanche, avalancheFuji } from '@/constants/chains';
import { createPublicClient, http } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../types/agent';
import { reportActionResult } from './agentApi';
import { storage } from './storage';
import { fetchAvaxBalance } from './walletActions/fetchBalance';

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
    transport: http(chain.rpcUrls.default.http[0]),
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
        // Aquí se implementará en el futuro
        throw new Error('La acción de enviar transacción no está implementada aún');
      
      case 'FETCH_HISTORY':
        // Aquí se implementará en el futuro
        throw new Error('La acción de historial de transacciones no está implementada aún');
      
      default:
        throw new Error(`Tipo de acción desconocida: ${actionType}`);
    }
  } catch (error: any) {
    console.error(`[WalletActionHandler] Error en la acción ${actionType}:`, error);
    
    // Retornar un formato consistente en caso de error
    return {
      success: false,
      responseMessage: `Error al procesar la solicitud.`, // Mensaje genérico, la IA proporcionará uno mejor
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