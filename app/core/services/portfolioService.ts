import BalanceService, { TokenBalance } from './balanceService';
import PriceService, { TokenPrice } from './priceService';

export interface PortfolioToken {
  symbol: string;
  name: string;
  balance: string; // Real balance from blockchain
  balanceRaw: bigint;
  decimals: number;
  address?: string;
  isNative: boolean;
  networkId: number;
  // Price information (mock)
  priceUSD: number;
  valueUSD: number; // balance * price
  change24h: number;
  priceLastUpdated: number;
}

export interface Portfolio {
  totalValueUSD: number;
  tokens: PortfolioToken[];
  walletAddress: string;
  networkId: number;
  lastUpdated: number;
}

/**
 * Portfolio Service
 * Combines REAL balances with MOCK prices to show complete portfolio view
 */
class PortfolioService {
  /**
   * Get complete portfolio with real balances and mock prices
   */
  static async getPortfolio(networkId: number = 43114): Promise<Portfolio> {
    try {
      console.log('[PortfolioService] Getting portfolio for network:', networkId);
      
      // Get real balances from blockchain
      const balances = await BalanceService.getAllBalances(networkId);
      console.log(`[PortfolioService] Retrieved ${balances.length} real balances`);

      // Get mock prices for all tokens
      const symbols = balances.map(balance => balance.symbol);
      const prices = await PriceService.getTokenPrices(symbols);
      console.log(`[PortfolioService] Retrieved ${prices.length} mock prices`);

      // Combine balances with prices
      const portfolioTokens: PortfolioToken[] = [];
      let totalValueUSD = 0;

      for (const balance of balances) {
        const price = prices.find(p => p.symbol.toUpperCase() === balance.symbol.toUpperCase());
        const priceUSD = price?.price || 0;
        const balanceAmount = parseFloat(balance.balance);
        const valueUSD = balanceAmount * priceUSD;

        portfolioTokens.push({
          ...balance,
          priceUSD,
          valueUSD: Number(valueUSD.toFixed(2)),
          change24h: price?.change24h || 0,
          priceLastUpdated: price?.lastUpdated || Date.now()
        });

        totalValueUSD += valueUSD;
      }

      const walletAddress = BalanceService.getWalletAddress();

      const portfolio: Portfolio = {
        totalValueUSD: Number(totalValueUSD.toFixed(2)),
        tokens: portfolioTokens.sort((a, b) => b.valueUSD - a.valueUSD), // Sort by value descending
        walletAddress,
        networkId,
        lastUpdated: Date.now()
      };

      console.log(`[PortfolioService] Portfolio total value: $${portfolio.totalValueUSD}`);
      return portfolio;
    } catch (error) {
      console.error('[PortfolioService] Error getting portfolio:', error);
      throw error;
    }
  }

  /**
   * Get real balance for a specific token
   */
  static async getTokenBalance(tokenSymbol: string, networkId: number = 43114): Promise<PortfolioToken | null> {
    try {
      let balance: TokenBalance | null;

      if (tokenSymbol.toUpperCase() === 'AVAX') {
        balance = await BalanceService.getAVAXBalance(networkId);
      } else if (tokenSymbol.toUpperCase() === 'USDC') {
        balance = await BalanceService.getUSDCBalance(networkId);
      } else if (tokenSymbol.toUpperCase() === 'WAVAX') {
        balance = await BalanceService.getWAVAXBalance(networkId);
      } else {
        // Fallback for other tokens
        return null;
      }

      if (!balance) {
        return null;
      }

      // Get mock price
      const price = await PriceService.getTokenPrice(tokenSymbol);
      const priceUSD = price?.price || 0;
      const balanceAmount = parseFloat(balance.balance);
      const valueUSD = balanceAmount * priceUSD;

      return {
        ...balance,
        priceUSD,
        valueUSD: Number(valueUSD.toFixed(2)),
        change24h: price?.change24h || 0,
        priceLastUpdated: price?.lastUpdated || Date.now()
      };
    } catch (error) {
      console.error(`[PortfolioService] Error getting balance for ${tokenSymbol}:`, error);
      return null;
    }
  }

  /**
   * Get formatted portfolio summary for display
   */
  static async getPortfolioSummary(networkId: number = 43114): Promise<{
    totalBalance: string;
    mainTokenBalance: string;
    tokenCount: number;
    walletAddress: string;
  }> {
    try {
      const portfolio = await this.getPortfolio(networkId);
      
      // Find main token (AVAX)
      const avaxToken = portfolio.tokens.find(token => token.symbol === 'AVAX');
      const mainTokenBalance = avaxToken ? `${avaxToken.balance} AVAX` : '0 AVAX';

      return {
        totalBalance: `$${portfolio.totalValueUSD}`,
        mainTokenBalance,
        tokenCount: portfolio.tokens.length,
        walletAddress: portfolio.walletAddress
      };
    } catch (error) {
      console.error('[PortfolioService] Error getting portfolio summary:', error);
      return {
        totalBalance: '$0.00',
        mainTokenBalance: '0 AVAX',
        tokenCount: 0,
        walletAddress: ''
      };
    }
  }

  /**
   * Check if wallet has sufficient balance for a transaction (with real balance check)
   */
  static async canMakeTransaction(
    tokenSymbol: string,
    amount: number,
    networkId: number = 43114
  ): Promise<{
    canProceed: boolean;
    currentBalance: string;
    currentValueUSD: number;
    requiredAmount: string;
    requiredValueUSD: number;
    message: string;
  }> {
    try {
      // Get real balance
      const balanceCheck = await BalanceService.hasSufficientBalance(tokenSymbol, amount, networkId);
      
      // Get mock price for USD calculations
      const price = await PriceService.getTokenPrice(tokenSymbol);
      const priceUSD = price?.price || 0;
      
      const currentValueUSD = parseFloat(balanceCheck.currentBalance) * priceUSD;
      const requiredValueUSD = amount * priceUSD;

      let message = '';
      if (balanceCheck.sufficient) {
        message = `Transaction can proceed. You have ${balanceCheck.currentBalance} ${tokenSymbol} ($${currentValueUSD.toFixed(2)})`;
      } else {
        const shortfall = amount - parseFloat(balanceCheck.currentBalance);
        const shortfallUSD = shortfall * priceUSD;
        message = `Insufficient balance. You need ${shortfall.toFixed(4)} more ${tokenSymbol} ($${shortfallUSD.toFixed(2)})`;
      }

      return {
        canProceed: balanceCheck.sufficient,
        currentBalance: balanceCheck.currentBalance,
        currentValueUSD: Number(currentValueUSD.toFixed(2)),
        requiredAmount: amount.toString(),
        requiredValueUSD: Number(requiredValueUSD.toFixed(2)),
        message
      };
    } catch (error) {
      console.error('[PortfolioService] Error checking transaction feasibility:', error);
      return {
        canProceed: false,
        currentBalance: '0',
        currentValueUSD: 0,
        requiredAmount: amount.toString(),
        requiredValueUSD: 0,
        message: 'Error checking balance'
      };
    }
  }

  /**
   * Refresh portfolio data (useful for pull-to-refresh)
   */
  static async refreshPortfolio(networkId: number = 43114): Promise<Portfolio> {
    console.log('[PortfolioService] Refreshing portfolio data...');
    return this.getPortfolio(networkId);
  }
}

export default PortfolioService; 