import Constants from 'expo-constants';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { storage } from '../core/storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';
const WALLET_SAVED_KEY = 'walletSavedInBackend'; // Key para recordar si ya guardamos la wallet
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';

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