import { avalancheFuji } from '@/constants/chains';
import Constants from 'expo-constants';
import { createPublicClient, formatEther, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { storage } from '../core/storage';
import { requestFaucetTokens } from './faucetService';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';
const WALLET_SAVED_KEY = 'walletSavedInBackend'; // Key para recordar si ya guardamos la wallet
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';
const MIN_BALANCE_THRESHOLD = 0.02; // Umbral mínimo de balance en AVAX

/**
 * Cargar o crear una nueva wallet
 */
export async function loadWallet() {
  try {
    // Intentamos cargar la clave privada del almacenamiento
    let privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    
    // Si no existe, generamos una nueva
    if (!privateKey) {
      console.log('No private key found, generating a new one...');
      privateKey = generatePrivateKey();
      storage.set(PRIVATE_KEY_STORAGE_KEY, privateKey);
    }
    
    // Convertimos la clave privada en una cuenta
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    return {
      address: account.address,
      account
    };
  } catch (error) {
    console.error('Error loading or creating wallet:', error);
    throw error;
  }
}

/**
 * Obtener la dirección de la wallet
 */
export async function getWalletAddress() {
  try {
    const wallet = await loadWallet();
    return wallet?.address || null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Crear y guardar una nueva wallet
 */
export async function createAndSaveWallet() {
  try {
    const wallet = await loadWallet();
    return wallet;
  } catch (error) {
    console.error('Error creating and saving wallet:', error);
    throw error;
  }
}

/**
 * Guardar la dirección de wallet en el backend (solo una vez)
 */
export async function saveWalletToBackend(userId: string) {
  try {
    // Comprobamos si ya guardamos la wallet para este usuario
    const walletSaved = storage.getBoolean(`${WALLET_SAVED_KEY}_${userId}`);
    
    // Si ya la guardamos, no hacemos nada
    if (walletSaved) {
      console.log('Wallet already saved in backend for user:', userId);
      return true;
    }
    
    // Obtenemos la dirección de la wallet
    const wallet = await loadWallet();
    
    if (!wallet) {
      console.error('No wallet found to save');
      return false;
    }
    
    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Guardamos la wallet en el backend usando fetch
    const response = await fetch(`${BACKEND_URL}/wallet/address`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        walletAddress: wallet.address,
        network: 'avalanche', // Default network
        type: 'evm'
      }),
    });
    
    if (response.ok) {
      // Marcamos que ya guardamos la wallet para este usuario
      storage.set(`${WALLET_SAVED_KEY}_${userId}`, true);
      console.log('Wallet saved successfully in backend for user:', userId);
      return true;
    } else {
      const errorBody = await response.text();
      console.error('Failed to save wallet in backend:', response.status, errorBody);
      return false;
    }
  } catch (error) {
    console.error('Error saving wallet to backend:', error);
    return false;
  }
}

/**
 * Verificar el balance de la wallet y solicitar tokens del faucet si es necesario
 * @param userId ID del usuario
 */
export async function checkBalanceAndRequestFaucet(userId: string): Promise<{
  success: boolean;
  message: string;
  currentBalance: string;
  faucetUsed: boolean;
}> {
  try {
    // Cargar la wallet
    const wallet = await loadWallet();
    if (!wallet) {
      return {
        success: false,
        message: 'No se pudo cargar la wallet',
        currentBalance: '0',
        faucetUsed: false
      };
    }

    // Configurar cliente para consultar el balance
    const client = createPublicClient({
      chain: avalancheFuji,
      transport: http(avalancheFuji.rpcUrls.default.http[0])
    });

    // Consultar balance
    const balanceWei = await client.getBalance({
      address: wallet.address
    });

    // Convertir de wei a AVAX
    const balanceAvax = parseFloat(formatEther(balanceWei));
    console.log(`[WalletService] Balance actual: ${balanceAvax} AVAX`);

    // Si el balance es menor al umbral, solicitar tokens del faucet
    if (balanceAvax < MIN_BALANCE_THRESHOLD) {
      console.log(`[WalletService] Balance menor a ${MIN_BALANCE_THRESHOLD} AVAX, solicitando tokens del faucet...`);
      
      const faucetResult = await requestFaucetTokens(userId, wallet.address, 'fuji');
      
      // Esperar un momento para que la transacción sea procesada
      if (faucetResult.success && faucetResult.txHash) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Consultar el balance actualizado
        const updatedBalanceWei = await client.getBalance({
          address: wallet.address
        });
        const updatedBalanceAvax = parseFloat(formatEther(updatedBalanceWei));
        
        return {
          success: true,
          message: `Se han solicitado tokens del faucet exitosamente. Balance actualizado: ${updatedBalanceAvax.toFixed(4)} AVAX`,
          currentBalance: updatedBalanceAvax.toFixed(4),
          faucetUsed: true
        };
      } else {
        return {
          success: faucetResult.success,
          message: faucetResult.message,
          currentBalance: balanceAvax.toFixed(4),
          faucetUsed: false
        };
      }
    } else {
      return {
        success: true,
        message: `El balance actual (${balanceAvax.toFixed(4)} AVAX) es suficiente`,
        currentBalance: balanceAvax.toFixed(4),
        faucetUsed: false
      };
    }
  } catch (error: any) {
    console.error('[WalletService] Error al verificar balance y solicitar tokens:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      currentBalance: '0',
      faucetUsed: false
    };
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function WalletServiceExport() {
  return null; // This will never be rendered
} 