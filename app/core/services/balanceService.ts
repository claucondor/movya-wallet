import { createPublicClient, formatEther, formatUnits, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from '../../../constants/chains';
import { storage } from '../storage';
import { AVALANCHE_TOKENS, getTokenInfo, SUPPORTED_TOKENS } from '../../../constants/tokens';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string; // Formatted balance (e.g., "10.5")
  balanceRaw: bigint; // Raw balance in smallest unit
  decimals: number;
  address?: string; // Contract address (undefined for native tokens)
  isNative: boolean;
  networkId: number;
}

/**
 * Real Balance Service
 * Connects to Avalanche blockchain to get actual wallet balances
 */
class BalanceService {
  /**
   * Get the current wallet account from storage
   */
  private static getWalletAccount() {
    const privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No wallet found. Please log in again.');
    }
    return privateKeyToAccount(privateKey as `0x${string}`);
  }

  /**
   * Create a public client for the specified network
   */
  private static createClient(networkId: number = 43114) {
    const isTestnet = networkId === 43113;
    const chain = isTestnet ? avalancheFuji : avalanche;
    
    return createPublicClient({
      chain,
      transport: http() // Usar la configuración por defecto del chain que ya incluye fallbacks
    });
  }

  /**
   * Get AVAX (native token) balance
   */
  static async getAVAXBalance(networkId: number = 43114): Promise<TokenBalance> {
    const account = this.getWalletAccount();
    const client = this.createClient(networkId);

    const balanceWei = await client.getBalance({
      address: account.address
    });

    const balanceFormatted = formatEther(balanceWei);
    const avaxToken = getTokenInfo('AVAX');

    return {
      symbol: 'AVAX',
      name: 'Avalanche',
      balance: Number(balanceFormatted).toFixed(4),
      balanceRaw: balanceWei,
      decimals: 18,
      isNative: true,
      networkId,
      address: undefined
    };
  }

  /**
   * Get ERC-20 token balance (like USDC)
   */
  static async getTokenBalance(tokenAddress: string, tokenSymbol: string, networkId: number = 43114): Promise<TokenBalance | null> {
    try {
      const account = this.getWalletAccount();
      const client = this.createClient(networkId);
      const token = getTokenInfo(tokenSymbol as any);
      
      if (!token) {
        console.warn(`[BalanceService] Token ${tokenSymbol} not found for network ${networkId}`);
        return null;
      }

      // ERC-20 balanceOf function call
      const balanceRaw = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [{ name: '_owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            type: 'function'
          }
        ],
        functionName: 'balanceOf',
        args: [account.address]
      }) as bigint;

      const balanceFormatted = formatUnits(balanceRaw, token.decimals);

      return {
        symbol: token.symbol,
        name: token.name,
        balance: Number(balanceFormatted).toFixed(token.decimals === 6 ? 2 : 4),
        balanceRaw,
        decimals: token.decimals,
        address: tokenAddress,
        isNative: false,
        networkId
      };
    } catch (error) {
      console.error(`[BalanceService] Error getting ${tokenSymbol} balance:`, error);
      return null;
    }
  }

  /**
   * Get USDC balance specifically
   */
  static async getUSDCBalance(networkId: number = 43114): Promise<TokenBalance | null> {
    const usdcToken = getTokenInfo('USDC');
    if (!usdcToken || !usdcToken.address) {
      console.warn(`[BalanceService] USDC token not configured for network ${networkId}`);
      return null;
    }

    return this.getTokenBalance(usdcToken.address, 'USDC', networkId);
  }

  /**
   * Get WAVAX balance specifically
   */
  static async getWAVAXBalance(networkId: number = 43114): Promise<TokenBalance | null> {
    const wavaxToken = getTokenInfo('WAVAX');
    if (!wavaxToken || !wavaxToken.address) {
      console.warn(`[BalanceService] WAVAX token not configured for network ${networkId}`);
      return null;
    }

    return this.getTokenBalance(wavaxToken.address, 'WAVAX', networkId);
  }

  /**
   * Get all token balances for the current wallet
   */
  static async getAllBalances(networkId: number = 43114): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];

      // Get AVAX balance
      const avaxBalance = await this.getAVAXBalance(networkId);
      balances.push(avaxBalance);

      // Get ERC-20 token balances
      const supportedTokens = ['USDC', 'WAVAX'];
      
      const tokenBalancePromises = supportedTokens.map(tokenSymbol => {
        const tokenInfo = getTokenInfo(tokenSymbol as any);
        if (tokenInfo && tokenInfo.address) {
          return this.getTokenBalance(tokenInfo.address, tokenSymbol, networkId);
        }
        return null;
      });

      const tokenBalances = await Promise.all(tokenBalancePromises);
      const validBalances = tokenBalances.filter(balance => balance !== null) as TokenBalance[];
      
      balances.push(...validBalances);

      console.log(`[BalanceService] Retrieved ${balances.length} balances for network ${networkId}`);
      return balances;
    } catch (error) {
      console.error('[BalanceService] Error getting all balances:', error);
      throw error;
    }
  }

  /**
   * Get total portfolio value in USD (requires price service)
   */
  static async getPortfolioValue(networkId: number = 43114): Promise<{
    totalUSD: number;
    balances: TokenBalance[];
  }> {
    const balances = await this.getAllBalances(networkId);
    
    // For now, return 0 USD value - this would integrate with PriceService
    // to calculate real USD values: balance.amount * tokenPrice
    console.log('[BalanceService] Portfolio value calculation would integrate with PriceService');
    
    return {
      totalUSD: 0, // This would be calculated using PriceService
      balances
    };
  }

  /**
   * Check if wallet has sufficient balance for a transaction
   */
  static async hasSufficientBalance(
    tokenSymbol: string, 
    amount: number, 
    networkId: number = 43114
  ): Promise<{ sufficient: boolean; currentBalance: string; required: string }> {
    try {
      let balance: TokenBalance | null;

      if (tokenSymbol.toUpperCase() === 'AVAX') {
        balance = await this.getAVAXBalance(networkId);
      } else if (tokenSymbol.toUpperCase() === 'USDC') {
        balance = await this.getUSDCBalance(networkId);
      } else if (tokenSymbol.toUpperCase() === 'WAVAX') {
        balance = await this.getWAVAXBalance(networkId);
      } else {
        const token = getTokenInfo(tokenSymbol as any);
        if (!token || !token.address) {
          throw new Error(`Token ${tokenSymbol} not found or has no address`);
        }
        balance = await this.getTokenBalance(token.address, tokenSymbol, networkId);
      }

      if (!balance) {
        throw new Error(`Could not retrieve balance for ${tokenSymbol}`);
      }

      const currentBalance = parseFloat(balance.balance);
      const sufficient = currentBalance >= amount;

      return {
        sufficient,
        currentBalance: balance.balance,
        required: amount.toString()
      };
    } catch (error) {
      console.error('[BalanceService] Error checking sufficient balance:', error);
      return {
        sufficient: false,
        currentBalance: '0',
        required: amount.toString()
      };
    }
  }

  /**
   * Get wallet address
   */
  static getWalletAddress(): string {
    const account = this.getWalletAccount();
    return account.address;
  }
}

export default BalanceService; 