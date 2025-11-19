import { Request, Response } from 'express';
import { generateSecretKey, generateWallet, getStxAddress } from '@stacks/wallet-sdk';

/**
 * Generate a new Stacks wallet
 * POST /wallet/generate
 */
export async function generateWalletHandler(req: Request, res: Response) {
  try {
    console.log('[generateWalletHandler] Generating new Stacks wallet...');

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
