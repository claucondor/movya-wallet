import { avalancheFuji } from '@/constants/chains';
import { createPublicClient, createWalletClient, formatEther, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../../types/agent';
import { storage } from '../storage';
import { WalletActionResult } from '../walletActionHandler';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Envía una transacción de AVAX a otra dirección en la red Avalanche Fuji
 */
export async function sendTransaction(
  recipientAddress: string,
  amount: string
): Promise<WalletActionResult> {
  console.log('[sendTransaction] Iniciando envío de transacción');

  try {
    // Validaciones básicas
    if (!recipientAddress) {
      throw new Error('La dirección del destinatario es requerida');
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('El monto debe ser mayor que cero');
    }

    // 1. Obtener la private key almacenada
    const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No se encontró la llave privada. Por favor, inicia sesión de nuevo.');
    }

    // 2. Crear la cuenta a partir de la llave privada
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`[sendTransaction] Preparando transacción desde ${account.address}`);

    // 3. Configurar el cliente público para consultar datos
    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(avalancheFuji.rpcUrls.default.http[0])
    });

    // 4. Verificar balance antes de la transacción
    const balanceWei = await publicClient.getBalance({
      address: account.address
    });
    
    const balanceFormatted = formatEther(balanceWei);
    console.log(`[sendTransaction] Balance actual: ${balanceFormatted} AVAX`);

    // 5. Convertir el monto de envío a wei (unidades más pequeñas)
    const amountWei = parseEther(amount);

    // 6. Verificar si hay suficiente balance (considerando gas estimado)
    // Estimamos un 10% adicional para gas (simplificado)
    const estimatedGasWei = amountWei / 10n;
    const totalRequired = amountWei + estimatedGasWei;

    if (balanceWei < totalRequired) {
      throw new Error(`Balance insuficiente. Tienes ${balanceFormatted} AVAX pero necesitas aproximadamente ${formatEther(totalRequired)} AVAX (incluyendo gas estimado).`);
    }

    // 7. Crear wallet client para enviar la transacción
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(avalancheFuji.rpcUrls.default.http[0])
    });

    // 8. Enviar la transacción
    console.log(`[sendTransaction] Enviando ${amount} AVAX a ${recipientAddress}`);
    const hash = await walletClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountWei,
      account,
    });

    console.log(`[sendTransaction] Transacción enviada con éxito. Hash: ${hash}`);

    // 9. Obtener el balance actualizado después de la transacción
    // Esperar un poco para que la transacción sea procesada
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newBalanceWei = await publicClient.getBalance({
      address: account.address
    });
    
    const newBalanceFormatted = formatEther(newBalanceWei);
    console.log(`[sendTransaction] Nuevo balance después de la transacción: ${newBalanceFormatted} AVAX`);

    // 10. Preparar los datos para reportar al agente
    const actionResult: ActionResultInput = {
      actionType: 'SEND_TRANSACTION',
      status: 'success',
      data: {
        transactionHash: hash,
        amountSent: amount,
        currencySent: 'AVAX',
        recipient: recipientAddress,
        // Podemos incluir también el nuevo balance
        balance: `${newBalanceFormatted} AVAX`
      }
    };

    // 11. Reportar el resultado
    return {
      success: true,
      responseMessage: `Transacción completada. Se enviaron ${amount} AVAX a ${recipientAddress}. Hash de transacción: ${hash}`,
      data: actionResult
    };
  } catch (error: any) {
    console.error('[sendTransaction] Error al enviar transacción:', error);

    // En caso de error, formatear la respuesta de error
    const actionResult: ActionResultInput = {
      actionType: 'SEND_TRANSACTION',
      status: 'failure',
      data: {
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message || 'Error desconocido al enviar la transacción'
      }
    };

    return {
      success: false,
      responseMessage: `Error al enviar transacción: ${error.message || 'Error desconocido'}`,
      data: actionResult
    };
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function SendTransactionExport() {
  return null; // This will never be rendered
} 