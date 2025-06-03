import { avalanche, avalancheFuji } from '@/constants/chains';
import { createPublicClient, createWalletClient, formatEther, formatUnits, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../../types/agent';
import { storage } from '../storage';
import { WalletActionResult } from '../walletActionHandler';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

// USDC Contract address on Avalanche mainnet
const USDC_CONTRACT_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

// ABI for USDC ERC-20 transfer
const USDC_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * Envía una transacción de AVAX o USDC a otra dirección en la red Avalanche
 */
export async function sendTransaction(
  recipientAddress: string,
  amount: string,
  currency: 'AVAX' | 'USDC' = 'AVAX'
): Promise<WalletActionResult> {
  console.log(`[sendTransaction] Iniciando envío de ${amount} ${currency} a ${recipientAddress}`);

  try {
    // Validaciones básicas
    if (!recipientAddress) {
      throw new Error('La dirección del destinatario es requerida');
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('El monto debe ser mayor que cero');
    }

    if (!['AVAX', 'USDC'].includes(currency)) {
      throw new Error('Moneda no soportada. Solo AVAX y USDC están disponibles.');
    }

    // 1. Obtener la private key almacenada
    const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No se encontró la llave privada. Por favor, inicia sesión de nuevo.');
    }

    // 2. Crear la cuenta a partir de la llave privada
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    console.log(`[sendTransaction] Preparando transacción desde ${account.address}`);

    // 3. Usar mainnet para transacciones reales
    const chain = avalanche; // Cambiado de avalancheFuji a mainnet
    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    // 4. Crear wallet client
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http()
    });

    let hash: string;
    let balanceAfter: string;

    if (currency === 'AVAX') {
      // Manejo de AVAX (nativo)
      const balanceWei = await publicClient.getBalance({
        address: account.address
      });
      
      const balanceFormatted = formatEther(balanceWei);
      console.log(`[sendTransaction] Balance actual: ${balanceFormatted} AVAX`);

      const amountWei = parseEther(amount);
      
      // Verificar balance suficiente
      if (balanceWei < amountWei) {
        throw new Error(`Balance insuficiente. Tienes ${balanceFormatted} AVAX pero intentas enviar ${amount} AVAX.`);
      }

      console.log(`[sendTransaction] Enviando ${amount} AVAX a ${recipientAddress}`);
      hash = await walletClient.sendTransaction({
        to: recipientAddress as `0x${string}`,
        value: amountWei,
        account,
      });

      // Obtener balance actualizado
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newBalanceWei = await publicClient.getBalance({
        address: account.address
      });
      balanceAfter = `${formatEther(newBalanceWei)} AVAX`;
      
    } else {
      // Manejo de USDC (ERC-20)
      const usdcBalance = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      });

      const balanceFormatted = formatUnits(usdcBalance, 6); // USDC tiene 6 decimales
      console.log(`[sendTransaction] Balance actual: ${balanceFormatted} USDC`);

      const amountUnits = parseUnits(amount, 6); // USDC tiene 6 decimales
      
      // Verificar balance suficiente
      if (usdcBalance < amountUnits) {
        throw new Error(`Balance insuficiente. Tienes ${balanceFormatted} USDC pero intentas enviar ${amount} USDC.`);
      }

      console.log(`[sendTransaction] Enviando ${amount} USDC a ${recipientAddress}`);
      hash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountUnits],
        account,
      });

      // Obtener balance actualizado
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newUsdcBalance = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [account.address]
      });
      balanceAfter = `${formatUnits(newUsdcBalance, 6)} USDC`;
    }

    console.log(`[sendTransaction] Transacción enviada con éxito. Hash: ${hash}`);
    console.log(`[sendTransaction] Nuevo balance después de la transacción: ${balanceAfter}`);

    // Preparar los datos para reportar al agente
    const actionResult: ActionResultInput = {
      actionType: 'SEND_TRANSACTION',
      status: 'success',
      data: {
        transactionHash: hash,
        amountSent: amount,
        currencySent: currency,
        recipient: recipientAddress,
        balance: balanceAfter
      }
    };

    return {
      success: true,
      responseMessage: `Transacción completada. Se enviaron ${amount} ${currency} a ${recipientAddress}. Hash de transacción: ${hash}`,
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