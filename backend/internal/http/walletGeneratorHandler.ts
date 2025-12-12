import { Request, Response } from 'express';
import { generateSecretKey, generateWallet, getStxAddress } from '@stacks/wallet-sdk';
import UserService from '../users/userService';

/**
 * Generate a new Stacks wallet
 * POST /wallet/generate
 * Body: { userId?: string } - If provided, wallet addresses will be saved to Firestore
 */
export async function generateWalletHandler(req: Request, res: Response) {
  try {
    const { userId } = req.body || {};
    console.log('[generateWalletHandler] Generating new Stacks wallet...', userId ? `for user ${userId}` : '');

    // Generate 24-word mnemonic
    const mnemonic = generateSecretKey(256);

    // Generate wallet from mnemonic
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: '',
    });

    // Get first account
    const account = wallet.accounts[0];

    // Get mainnet address
    const mainnetAddress = getStxAddress(account, 'mainnet');

    // Get testnet address
    const testnetAddress = getStxAddress(account, 'testnet');

    console.log('[generateWalletHandler] Wallet generated successfully');
    console.log('[generateWalletHandler] Mainnet address:', mainnetAddress);
    console.log('[generateWalletHandler] Testnet address:', testnetAddress);

    // If userId provided, save addresses to Firestore for email resolution
    if (userId) {
      try {
        await UserService.saveWalletAddresses(userId, {
          mainnet: mainnetAddress,
          testnet: testnetAddress
        });
        console.log('[generateWalletHandler] Wallet addresses saved to Firestore for user:', userId);
      } catch (saveError) {
        console.error('[generateWalletHandler] Failed to save addresses to Firestore:', saveError);
        // Don't fail the request - wallet was generated successfully
      }
    }

    // Return wallet data
    res.status(200).json({
      success: true,
      wallet: {
        mainnet: {
          address: mainnetAddress,
          network: 'mainnet'
        },
        testnet: {
          address: testnetAddress,
          network: 'testnet'
        },
        privateKey: account.stxPrivateKey,
        mnemonic: mnemonic,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[generateWalletHandler] Error generating wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate wallet'
    });
  }
}
