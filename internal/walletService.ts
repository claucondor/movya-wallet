import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';

// Key used to store the private key in SecureStore
const SECURE_STORE_KEY = 'ethereumPrivateKey';

/**
 * Creates a new random Ethereum wallet and saves its private key securely.
 * @returns {Promise<ethers.Wallet>} The created wallet instance.
 * @throws {Error} If saving to SecureStore fails.
 */
export const createAndSaveWallet = async (): Promise<ethers.Wallet> => {
  try {
    const wallet = ethers.Wallet.createRandom();
    await SecureStore.setItemAsync(SECURE_STORE_KEY, wallet.privateKey);
    console.log('New wallet created and private key saved securely.');
    return wallet;
  } catch (error) {
    console.error('Failed to create and save wallet:', error);
    throw new Error('Could not save wallet private key.');
  }
};

/**
 * Loads the wallet by retrieving the private key from SecureStore.
 * @returns {Promise<ethers.Wallet | null>} The wallet instance if found, otherwise null.
 */
export const loadWallet = async (): Promise<ethers.Wallet | null> => {
  try {
    const privateKey = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (privateKey) {
      const wallet = new ethers.Wallet(privateKey);
      // Optional: Could add a provider here if needed immediately
      // const provider = new ethers.providers.JsonRpcProvider(YOUR_RPC_URL);
      // return wallet.connect(provider);
      return wallet;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Failed to load wallet:', error);
    return null;
  }
};

/**
 * Gets the public address of the stored wallet.
 * @returns {Promise<string | null>} The Ethereum address if the wallet exists, otherwise null.
 */
export const getWalletAddress = async (): Promise<string | null> => {
  const wallet = await loadWallet();
  return wallet ? wallet.address : null;
};

/**
 * Deletes the stored private key from SecureStore.
 * Use with caution (e.g., on logout or account deletion).
 * @returns {Promise<void>}
 */
export const deleteWallet = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    console.log('Wallet private key deleted from SecureStore.');
  } catch (error) {
    console.error('Failed to delete wallet key:', error);
  }
};

// Example of how to sign a transaction (you would call this from your UI logic)
/*
export const signTransaction = async (transaction: ethers.providers.TransactionRequest): Promise<string> => {
  const wallet = await loadWallet();
  if (!wallet) {
    throw new Error('Wallet not found. Cannot sign transaction.');
  }
  // Ensure the wallet is connected to a provider if needed for populating fields
  // const provider = new ethers.providers.JsonRpcProvider(YOUR_RPC_URL);
  // const connectedWallet = wallet.connect(provider);
  // const signedTx = await connectedWallet.signTransaction(transaction);

  // If the transaction object is fully populated, you can sign directly
  const signedTx = await wallet.signTransaction(transaction);
  return signedTx;
};
*/ 