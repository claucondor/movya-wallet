import { avalanche } from '@/constants/chains';
import { createPublicClient, formatEther, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../../types/agent';
import { storage } from '../storage';
import { WalletActionResult } from '../walletActionHandler';
import BalanceService from '../services/balanceService';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Consulta el balance completo del usuario en Avalanche mainnet (AVAX y USDC)
 */
export async function fetchAvaxBalance(): Promise<WalletActionResult> {
  console.log('[fetchBalance] Iniciando consulta de balance en Avalanche mainnet');

  try {
    // 1. Obtener balances de ambos tokens usando el BalanceService
    const avaxBalance = await BalanceService.getAVAXBalance(43114); // Avalanche mainnet
    const usdcBalance = await BalanceService.getUSDCBalance(43114); // Avalanche mainnet

    // 2. Formatear la información de balance
    let balanceText = `${avaxBalance.balance} AVAX`;
    
    if (usdcBalance) {
      balanceText += ` y ${usdcBalance.balance} USDC`;
    }
    
    balanceText += ` en Avalanche mainnet`;

    console.log(`[fetchBalance] Balance obtenido: ${balanceText}`);

    // 3. Preparar los datos para reportar al agente
    const actionResult: ActionResultInput = {
      actionType: 'FETCH_BALANCE',
      status: 'success',
      data: {
        balance: balanceText
      }
    };

    // 4. Reportar el resultado al agente para obtener una respuesta natural
    return {
      success: true,
      responseMessage: "",
      data: actionResult
    };
  } catch (error: any) {
    console.error('[fetchBalance] Error al consultar balance:', error);

    // En caso de error, formatear la respuesta de error
    const actionResult: ActionResultInput = {
      actionType: 'FETCH_BALANCE',
      status: 'failure',
      data: {
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message || 'Error desconocido al consultar balance'
      }
    };

    return {
      success: false,
      responseMessage: "",
      data: actionResult
    };
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function FetchBalanceExport() {
  return null; // This will never be rendered
} 