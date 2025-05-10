import { avalancheFuji } from '@/constants/chains';
import { createPublicClient, formatEther, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../../types/agent';
import { storage } from '../storage';
import { WalletActionResult } from '../walletActionHandler';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Consulta el balance de AVAX en la red Avalanche Fuji
 */
export async function fetchAvaxBalance(): Promise<WalletActionResult> {
  console.log('[fetchBalance] Iniciando consulta de balance');

  try {
    // 1. Obtener la private key almacenada
    const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No se encontró la llave privada. Por favor, inicia sesión de nuevo.');
    }

    // 2. Crear la cuenta a partir de la llave privada
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`[fetchBalance] Consultando balance para ${account.address}`);

    // 3. Configurar el cliente para interactuar con Avalanche Fuji
    const client = createPublicClient({
      chain: avalancheFuji,
      transport: http(avalancheFuji.rpcUrls.default.http[0])
    });

    // 4. Consultar el balance
    const balanceWei = await client.getBalance({
      address: account.address
    });

    // 5. Formatear el balance para mostrarlo
    const balanceFormatted = formatEther(balanceWei);
    // Truncar a 4 decimales para una mejor visualización
    const balanceDisplay = parseFloat(balanceFormatted).toFixed(4);

    console.log(`[fetchBalance] Balance obtenido: ${balanceDisplay} AVAX`);

    // 6. Preparar los datos para reportar al agente
    const actionResult: ActionResultInput = {
      actionType: 'FETCH_BALANCE',
      status: 'success',
      data: {
        balance: `${balanceDisplay} AVAX en ${avalancheFuji.name}`
      }
    };

    // 7. Reportar el resultado al agente para obtener una respuesta natural
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