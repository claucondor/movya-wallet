import { storage } from '@core/storage'; // Updated import path
import { ethers } from 'ethers';

// Key used to store the private key
const STORAGE_KEY = 'ethereumPrivateKey';

/**
 * Creates a new random Ethereum wallet and saves its private key.
 * @returns {ethers.Wallet} The created wallet instance.
 * @throws {Error} If saving fails.
 */
export const createAndSaveWallet = (): ethers.Wallet => {
  try {
    const wallet = ethers.Wallet.createRandom();
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
export const loadWallet = (): ethers.Wallet | null => {
  try {
    const privateKey = storage.getString(STORAGE_KEY);
    if (privateKey) {
      const wallet = new ethers.Wallet(privateKey);
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
export const getWalletAddress = (): string | null => {
  const wallet = loadWallet();
  return wallet ? wallet.address : null;
};

/**
 * Deletes the stored private key from storage.
 * Use with caution (e.g., on logout or account deletion).
 * @returns {void}
 */
export const deleteWallet = (): void => {
  try {
    storage.delete(STORAGE_KEY);
    console.log('Wallet private key deleted from storage.');
  } catch (error) {
    console.error('Failed to delete wallet key:', error);
  }
}; 