import { ethers } from 'ethers';
import { storage } from '../app/core/storage'; // Import MMKV storage

// Key used to store the private key
const STORAGE_KEY = 'userPrivateKey'; // Renamed for clarity

/**
 * Creates a new random Ethereum wallet and saves its private key.
 * @returns {ethers.Wallet} The created wallet instance.
 * @throws {Error} If saving fails.
 */
export const createAndSaveWallet = (): ethers.Wallet => { // Remove async
  try {
    const wallet = ethers.Wallet.createRandom();
    // Use MMKV's synchronous set
    storage.set(STORAGE_KEY, wallet.privateKey);
    console.log('New wallet created and private key saved.');
    return wallet;
  } catch (error) {
    console.error('Failed to create and save wallet:', error);
    throw new Error('Could not save wallet private key.');
  }
};

/**
 * Loads the wallet by retrieving the private key from storage.
 * @returns {ethers.Wallet | null} The wallet instance if found, otherwise null.
 */
export const loadWallet = (): ethers.Wallet | null => { // Remove async
  try {
    // Use MMKV's synchronous getString
    const privateKey = storage.getString(STORAGE_KEY);
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
 * @returns {string | null} The Ethereum address if the wallet exists, otherwise null.
 */
export const getWalletAddress = (): string | null => { // Remove async
  const wallet = loadWallet(); // Now synchronous
  return wallet ? wallet.address : null;
};

/**
 * Deletes the stored private key from storage.
 * Use with caution (e.g., on logout or account deletion).
 * @returns {void}
 */
export const deleteWallet = (): void => { // Remove async and Promise
  try {
    // Use MMKV's synchronous delete
    storage.delete(STORAGE_KEY);
    console.log('Wallet private key deleted from storage.');
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