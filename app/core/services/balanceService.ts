import { DEFAULT_NETWORK, getHiroApiKey } from '../constants/networks';
import {
  findToken,
  formatTokenAmount,
  getTokensByNetwork,
} from '../constants/tokens';
import { getWalletAddress } from '../../internal/walletService';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string; // Formatted balance (e.g., "10.5")
  balanceRaw: bigint; // Raw balance in smallest unit
  decimals: number;
  contractAddress?: string; // SIP-010 contract principal (undefined for native STX)
  isNative: boolean;
  networkId: string;
}

/**
 * Balance Service for Stacks Blockchain
 * Connects to Hiro API to get actual wallet balances
 */
class BalanceService {
  /**
   * Get the current wallet address
   */
  private static async getAddress(): Promise<string> {
    const address = await getWalletAddress();
    if (!address) {
      throw new Error('No wallet found. Please log in again.');
    }
    return address;
  }

  /**
   * Get STX (native token) balance from Hiro API
   */
  static async getSTXBalance(networkId: string = 'mainnet'): Promise<TokenBalance> {
    try {
      const address = await this.getAddress();
      const network = networkId === 'mainnet' ? DEFAULT_NETWORK : DEFAULT_NETWORK; // TODO: Support testnet

      // Add API key to headers if available
      const headers: Record<string, string> = {};
      const apiKey = getHiroApiKey();
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch(`${network.url}/extended/v1/address/${address}/balances`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();

      // Balance is in microSTX (6 decimals)
      const balanceRaw = BigInt(data.stx.balance || '0');
      const stxToken = findToken('STX', networkId);

      if (!stxToken) {
        throw new Error('STX token not configured');
      }

      const balanceFormatted = formatTokenAmount(balanceRaw, stxToken);

      return {
        symbol: 'STX',
        name: 'Stacks',
        balance: balanceFormatted,
        balanceRaw,
        decimals: 6,
        isNative: true,
        networkId,
        contractAddress: undefined
      };
    } catch (error) {
      console.error('[BalanceService] Error getting STX balance:', error);
      throw error;
    }
  }

  /**
   * Get SIP-010 token balance (like sBTC, aUSD, ALEX)
   * Uses Hiro API extended endpoint to get fungible token balances
   */
  static async getTokenBalance(
    tokenSymbol: string,
    networkId: string = 'mainnet'
  ): Promise<TokenBalance | null> {
    try {
      const address = await this.getAddress();
      const token = findToken(tokenSymbol, networkId);

      if (!token) {
        console.warn(`[BalanceService] Token ${tokenSymbol} not found for network ${networkId}`);
        return null;
      }

      if (token.isNative) {
        return this.getSTXBalance(networkId);
      }

      if (!token.contractAddress) {
        console.warn(`[BalanceService] Token ${tokenSymbol} has no contract address`);
        return null;
      }

      const network = networkId === 'mainnet' ? DEFAULT_NETWORK : DEFAULT_NETWORK;

      // Add API key to headers if available
      const headers: Record<string, string> = {};
      const apiKey = getHiroApiKey();
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      // Use Hiro extended API to get all fungible token balances for the address
      const response = await fetch(
        `${network.url}/extended/v1/address/${address}/balances`,
        { headers }
      );

      if (!response.ok) {
        console.warn(`[BalanceService] Failed to fetch balances for ${address}:`, response.statusText);
        return null;
      }

      const data = await response.json();

      // Find the specific token in the fungible_tokens object
      // The key format is: "contractAddress::assetName"
      const ftKey = `${token.contractAddress}::${token.assetName || token.contractName}`;
      const ftBalance = data.fungible_tokens?.[ftKey];

      let balanceRaw: bigint = 0n;

      if (ftBalance && ftBalance.balance) {
        balanceRaw = BigInt(ftBalance.balance);
      } else {
        // Try alternative key formats
        const altKeys = Object.keys(data.fungible_tokens || {}).filter(k =>
          k.includes(token.contractName || '') ||
          k.includes(token.assetName || '')
        );

        if (altKeys.length > 0) {
          const altBalance = data.fungible_tokens[altKeys[0]];
          if (altBalance && altBalance.balance) {
            balanceRaw = BigInt(altBalance.balance);
          }
        }
      }

      const balanceFormatted = formatTokenAmount(balanceRaw, token);

      return {
        symbol: token.symbol,
        name: token.name,
        balance: balanceFormatted,
        balanceRaw,
        decimals: token.decimals,
        contractAddress: token.contractAddress,
        isNative: false,
        networkId
      };
    } catch (error) {
      console.error(`[BalanceService] Error getting ${tokenSymbol} balance:`, error);
      return null;
    }
  }

  /**
   * Get sBTC balance specifically
   */
  static async getSBTCBalance(networkId: string = 'mainnet'): Promise<TokenBalance | null> {
    return this.getTokenBalance('sBTC', networkId);
  }

  /**
   * Get USDA balance specifically
   */
  static async getUSDABalance(networkId: string = 'mainnet'): Promise<TokenBalance | null> {
    return this.getTokenBalance('USDA', networkId);
  }

  /**
   * Get all token balances for the current wallet
   */
  static async getAllBalances(networkId: string = 'mainnet'): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];

      // Get STX balance
      const stxBalance = await this.getSTXBalance(networkId);
      balances.push(stxBalance);

      // Get SIP-010 token balances
      const tokens = getTokensByNetwork(networkId);
      const sip010Tokens = tokens.filter(t => !t.isNative);

      const tokenBalancePromises = sip010Tokens.map(token =>
        this.getTokenBalance(token.symbol, networkId)
      );

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
  static async getPortfolioValue(networkId: string = 'mainnet'): Promise<{
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
    networkId: string = 'mainnet'
  ): Promise<{ sufficient: boolean; currentBalance: string; required: string }> {
    try {
      const balance = await this.getTokenBalance(tokenSymbol, networkId);

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
   * Get wallet address (public method)
   */
  static async getWalletAddress(): Promise<string> {
    return this.getAddress();
  }
}

export default BalanceService;
