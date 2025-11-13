import { DEFAULT_NETWORK } from '@/app/core/constants/networks';
import Constants from 'expo-constants';
import {
  generateSecretKey,
  generateWallet,
  getStxAddress,
} from '@stacks/wallet-sdk';
import { TransactionVersion } from '@stacks/transactions';
import { storage } from '../core/storage';
import { requestFaucetTokens } from './faucetService';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';
const MNEMONIC_STORAGE_KEY = 'userMnemonic';
const WALLET_SAVED_KEY = 'walletSavedInBackend';
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';
const MIN_BALANCE_THRESHOLD = 1; // Minimum 1 STX threshold

interface WalletData {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

/**
 * Generate a new Stacks wallet
 */
async function generateNewWallet(): Promise<WalletData> {
  try {
    // Generate 24-word mnemonic
    const mnemonic = generateSecretKey(256);

    // Generate wallet from mnemonic
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: '',
    });

    // Get first account
    const account = wallet.accounts[0];

    return {
      address: account.address, // Stacks address (SP... for mainnet, ST... for testnet)
      privateKey: account.stxPrivateKey,
      mnemonic: mnemonic,
    };
  } catch (error) {
    console.error('Error generating new wallet:', error);
    throw error;
  }
}

/**
 * Get Stacks address from private key
 */
function getAddressFromPrivateKey(privateKey: string, isTestnet: boolean = false): string {
  const version = isTestnet ? TransactionVersion.Testnet : TransactionVersion.Mainnet;
  return getStxAddress({ privateKey, version });
}

/**
 * Load or create a new wallet
 */
export async function loadWallet(): Promise<WalletData> {
  try {
    // Try to load private key from storage
    let privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    let mnemonic = storage.getString(MNEMONIC_STORAGE_KEY);

    // If no private key exists, generate a new wallet
    if (!privateKey) {
      console.log('No private key found, generating a new Stacks wallet...');
      const newWallet = await generateNewWallet();

      // Save to storage
      storage.set(PRIVATE_KEY_STORAGE_KEY, newWallet.privateKey);
      if (newWallet.mnemonic) {
        storage.set(MNEMONIC_STORAGE_KEY, newWallet.mnemonic);
      }

      return newWallet;
    }

    // Get address from existing private key
    const isTestnet = DEFAULT_NETWORK.isTestnet;
    const address = getAddressFromPrivateKey(privateKey, isTestnet);

    return {
      address,
      privateKey,
      mnemonic,
    };
  } catch (error) {
    console.error('Error loading or creating wallet:', error);
    throw error;
  }
}

/**
 * Get wallet address
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const wallet = await loadWallet();
    return wallet?.address || null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Get private key (use with caution - for signing transactions)
 */
export async function getPrivateKey(): Promise<string | null> {
  try {
    const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    return privateKey || null;
  } catch (error) {
    console.error('Error getting private key:', error);
    return null;
  }
}

/**
 * Get mnemonic phrase (for backup/recovery)
 */
export async function getMnemonic(): Promise<string | null> {
  try {
    const mnemonic = storage.getString(MNEMONIC_STORAGE_KEY);
    return mnemonic || null;
  } catch (error) {
    console.error('Error getting mnemonic:', error);
    return null;
  }
}

/**
 * Create and save a new wallet
 */
export async function createAndSaveWallet(): Promise<WalletData> {
  try {
    const wallet = await loadWallet();
    return wallet;
  } catch (error) {
    console.error('Error creating and saving wallet:', error);
    throw error;
  }
}

/**
 * Save wallet address to backend (only once per user)
 */
export async function saveWalletToBackend(userId: string): Promise<boolean> {
  try {
    // Check if wallet already saved for this user
    const walletSaved = storage.getBoolean(`${WALLET_SAVED_KEY}_${userId}`);

    if (walletSaved) {
      console.log('Wallet already saved in backend for user:', userId);
      return true;
    }

    // Get wallet address
    const wallet = await loadWallet();

    if (!wallet) {
      console.error('No wallet found to save');
      return false;
    }

    // Get token if exists
    const token = storage.getString('userToken');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Save wallet to backend
    const response = await fetch(`${BACKEND_URL}/wallet/address`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        walletAddress: wallet.address,
        network: 'stacks', // Changed from 'avalanche' to 'stacks'
        type: 'stacks' // Changed from 'evm' to 'stacks'
      }),
    });

    if (response.ok) {
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
 * Get STX balance from Hiro API
 */
async function getSTXBalance(address: string): Promise<number> {
  try {
    const apiUrl = DEFAULT_NETWORK.url;
    const response = await fetch(`${apiUrl}/extended/v1/address/${address}/balances`);

    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }

    const data = await response.json();
    // Balance is in microSTX (6 decimals), convert to STX
    const microSTX = parseInt(data.stx.balance || '0');
    const stx = microSTX / 1_000_000;

    return stx;
  } catch (error) {
    console.error('Error fetching STX balance:', error);
    throw error;
  }
}

/**
 * Check balance and request faucet tokens if needed (testnet only)
 */
export async function checkBalanceAndRequestFaucet(userId: string): Promise<{
  success: boolean;
  message: string;
  currentBalance: string;
  faucetUsed: boolean;
}> {
  try {
    // Load wallet
    const wallet = await loadWallet();
    if (!wallet) {
      return {
        success: false,
        message: 'Could not load wallet',
        currentBalance: '0',
        faucetUsed: false
      };
    }

    // Get STX balance
    const balanceSTX = await getSTXBalance(wallet.address);
    console.log(`[WalletService] Current balance: ${balanceSTX} STX`);

    // If balance is below threshold and on testnet, request faucet tokens
    if (balanceSTX < MIN_BALANCE_THRESHOLD && DEFAULT_NETWORK.isTestnet) {
      console.log(`[WalletService] Balance below ${MIN_BALANCE_THRESHOLD} STX, requesting testnet tokens...`);

      const faucetResult = await requestFaucetTokens(userId, wallet.address, 'testnet');

      // Wait for transaction to process
      if (faucetResult.success) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get updated balance
        const updatedBalance = await getSTXBalance(wallet.address);

        return {
          success: true,
          message: `Testnet tokens requested successfully. Updated balance: ${updatedBalance.toFixed(6)} STX`,
          currentBalance: updatedBalance.toFixed(6),
          faucetUsed: true
        };
      } else {
        return {
          success: false,
          message: faucetResult.message,
          currentBalance: balanceSTX.toFixed(6),
          faucetUsed: false
        };
      }
    } else if (DEFAULT_NETWORK.isTestnet === false) {
      return {
        success: true,
        message: `Current balance: ${balanceSTX.toFixed(6)} STX (mainnet - faucet not available)`,
        currentBalance: balanceSTX.toFixed(6),
        faucetUsed: false
      };
    } else {
      return {
        success: true,
        message: `Current balance (${balanceSTX.toFixed(6)} STX) is sufficient`,
        currentBalance: balanceSTX.toFixed(6),
        faucetUsed: false
      };
    }
  } catch (error: any) {
    console.error('[WalletService] Error checking balance and requesting tokens:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      currentBalance: '0',
      faucetUsed: false
    };
  }
}

/**
 * Restore wallet from mnemonic
 */
export async function restoreWalletFromMnemonic(mnemonic: string): Promise<WalletData> {
  try {
    // Generate wallet from mnemonic
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: '',
    });

    const account = wallet.accounts[0];

    const walletData: WalletData = {
      address: account.address,
      privateKey: account.stxPrivateKey,
      mnemonic: mnemonic,
    };

    // Save to storage
    storage.set(PRIVATE_KEY_STORAGE_KEY, walletData.privateKey);
    storage.set(MNEMONIC_STORAGE_KEY, mnemonic);

    console.log('Wallet restored successfully from mnemonic');
    return walletData;
  } catch (error) {
    console.error('Error restoring wallet from mnemonic:', error);
    throw error;
  }
}

/**
 * Clear wallet data (use with caution!)
 */
export async function clearWallet(): Promise<void> {
  try {
    storage.delete(PRIVATE_KEY_STORAGE_KEY);
    storage.delete(MNEMONIC_STORAGE_KEY);

    // Clear all wallet saved flags
    const allKeys = storage.getAllKeys();
    allKeys.forEach(key => {
      if (key.startsWith(WALLET_SAVED_KEY)) {
        storage.delete(key);
      }
    });

    console.log('Wallet data cleared successfully');
  } catch (error) {
    console.error('Error clearing wallet:', error);
    throw error;
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function WalletServiceExport() {
  return null;
}
