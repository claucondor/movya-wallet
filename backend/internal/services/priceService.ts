import {
  callReadOnlyFunction,
  contractPrincipalCV,
  uintCV,
  cvToJSON,
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

export interface TokenPrice {
  symbol: string;
  price: number; // Price in USD
  change24h: number; // Percentage change in 24h
  lastUpdated: number; // Timestamp
}

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
}

// ALEX AMM contract for quotes
const ALEX_AMM_CONTRACT = {
  address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
  name: 'amm-pool-v2-01',
};

const POOL_FACTOR = '100000000';

// Token contracts for price queries
const TOKEN_CONTRACTS: Record<string, { address: string; name: string }> = {
  'STX': { address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM', name: 'token-wstx-v2' },
  'aBTC': { address: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK', name: 'token-abtc' },
  'aUSD': { address: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK', name: 'token-susdt' },
  'ALEX': { address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM', name: 'token-alex' },
};

// Cache for prices
interface PriceCache {
  prices: Record<string, TokenPrice>;
  lastFetched: number;
}

let priceCache: PriceCache | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

/**
 * Price Service for handling token prices and USD conversions
 * Uses ALEX DEX contract calls for real prices
 */
class PriceService {
  // Fallback prices (used when API fails)
  private static fallbackPrices: Record<string, TokenPrice> = {
    'STX': {
      symbol: 'STX',
      price: 0.30,
      change24h: 0,
      lastUpdated: Date.now()
    },
    'sBTC': {
      symbol: 'sBTC',
      price: 95000.00,
      change24h: 0,
      lastUpdated: Date.now()
    },
    'aUSD': {
      symbol: 'aUSD',
      price: 1.00,
      change24h: 0,
      lastUpdated: Date.now()
    },
    'ALEX': {
      symbol: 'ALEX',
      price: 0.002,
      change24h: 0,
      lastUpdated: Date.now()
    }
  };

  /**
   * Get quote from ALEX DEX using get-helper read-only call
   */
  private static async getAlexQuote(
    fromToken: { address: string; name: string },
    toToken: { address: string; name: string },
    amount: number
  ): Promise<number> {
    const network = new StacksMainnet();
    const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, 8)));

    const result = await callReadOnlyFunction({
      contractAddress: ALEX_AMM_CONTRACT.address,
      contractName: ALEX_AMM_CONTRACT.name,
      functionName: 'get-helper',
      functionArgs: [
        contractPrincipalCV(fromToken.address, fromToken.name),
        contractPrincipalCV(toToken.address, toToken.name),
        uintCV(POOL_FACTOR),
        uintCV(amountInBaseUnits.toString()),
      ],
      network,
      senderAddress: ALEX_AMM_CONTRACT.address,
    });

    const resultJSON = cvToJSON(result);

    if (resultJSON.success === false) {
      throw new Error(`Contract error: ${JSON.stringify(resultJSON.value)}`);
    }

    const outputAmountBigInt = BigInt(resultJSON.value?.value || resultJSON.value || 0);
    return Number(outputAmountBigInt) / Math.pow(10, 8);
  }

  /**
   * Fetch real prices from ALEX DEX contract
   * Uses aUSD as base ($1) and derives other prices from swap quotes
   */
  private static async fetchAlexPrices(): Promise<Record<string, TokenPrice>> {
    try {
      // Check cache first
      if (priceCache && (Date.now() - priceCache.lastFetched) < CACHE_DURATION) {
        return priceCache.prices;
      }

      console.log('[PriceService] Fetching real prices from ALEX DEX...');
      const prices: Record<string, TokenPrice> = {};
      const now = Date.now();

      // aUSD is always $1 (it's bridged USDT)
      prices['aUSD'] = {
        symbol: 'aUSD',
        price: 1.00,
        change24h: 0,
        lastUpdated: now
      };

      // Get aBTC price: 1 aBTC -> aUSD
      try {
        const abtcToAusd = await this.getAlexQuote(
          TOKEN_CONTRACTS['aBTC'],
          TOKEN_CONTRACTS['aUSD'],
          0.0001 // Small amount to get rate
        );
        const abtcPrice = abtcToAusd / 0.0001; // Price per 1 aBTC

        prices['sBTC'] = {
          symbol: 'sBTC',
          price: Number(abtcPrice.toFixed(2)),
          change24h: 0,
          lastUpdated: now
        };
        console.log(`[PriceService] sBTC/aBTC price: $${abtcPrice.toFixed(2)}`);
      } catch (error) {
        console.warn('[PriceService] Failed to get aBTC price:', error);
        prices['sBTC'] = this.fallbackPrices['sBTC'];
      }

      // Get STX price: 1 STX -> aUSD (via 2-hop if needed)
      try {
        // First try STX -> aBTC
        const stxToAbtc = await this.getAlexQuote(
          TOKEN_CONTRACTS['STX'],
          TOKEN_CONTRACTS['aBTC'],
          10 // 10 STX
        );
        // Then calculate STX price using aBTC price
        if (prices['sBTC']) {
          const stxPrice = (stxToAbtc / 10) * prices['sBTC'].price;
          prices['STX'] = {
            symbol: 'STX',
            price: Number(stxPrice.toFixed(4)),
            change24h: 0,
            lastUpdated: now
          };
          console.log(`[PriceService] STX price: $${stxPrice.toFixed(4)}`);
        }
      } catch (error) {
        console.warn('[PriceService] Failed to get STX price:', error);
        prices['STX'] = this.fallbackPrices['STX'];
      }

      // Get ALEX price: STX -> ALEX, then calculate
      try {
        const stxToAlex = await this.getAlexQuote(
          TOKEN_CONTRACTS['STX'],
          TOKEN_CONTRACTS['ALEX'],
          10 // 10 STX
        );
        // ALEX per STX
        const alexPerStx = stxToAlex / 10;
        // ALEX price = STX price / ALEX per STX
        if (prices['STX']) {
          const alexPrice = prices['STX'].price / alexPerStx;
          prices['ALEX'] = {
            symbol: 'ALEX',
            price: Number(alexPrice.toFixed(6)),
            change24h: 0,
            lastUpdated: now
          };
          console.log(`[PriceService] ALEX price: $${alexPrice.toFixed(6)}`);
        }
      } catch (error) {
        console.warn('[PriceService] Failed to get ALEX price:', error);
        prices['ALEX'] = this.fallbackPrices['ALEX'];
      }

      // Update cache
      priceCache = {
        prices,
        lastFetched: now
      };

      console.log('[PriceService] Prices updated:', Object.keys(prices).map(k => `${k}: $${prices[k].price}`).join(', '));
      return prices;
    } catch (error) {
      console.warn('[PriceService] Failed to fetch ALEX prices, using fallback:', error);
      return this.fallbackPrices;
    }
  }

  /**
   * Get available currencies that the system supports
   * @returns Array of supported currency symbols
   */
  static getSupportedCurrencies(): string[] {
    return Object.keys(this.fallbackPrices);
  }

  /**
   * Check if a currency is supported
   * @param currency Currency symbol to check
   * @returns Boolean indicating support
   */
  static isCurrencySupported(currency: string): boolean {
    const upper = currency.toUpperCase();
    // Also accept USDA as alias for aUSD for backwards compatibility
    if (upper === 'USDA') return true;
    return this.getSupportedCurrencies().map(s => s.toUpperCase()).includes(upper);
  }

  /**
   * Get price for a specific token
   * @param symbol Token symbol (e.g., 'STX', 'sBTC', 'aUSD', 'ALEX')
   * @returns Price data or null if not found
   */
  static async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    const prices = await this.fetchAlexPrices();

    let upperSymbol = symbol.toUpperCase();

    // Handle aliases
    if (upperSymbol === 'SBTC') upperSymbol = 'sBTC';
    if (upperSymbol === 'AUSD' || upperSymbol === 'USDA') upperSymbol = 'aUSD';

    const price = prices[upperSymbol];

    if (!price) {
      console.warn(`[PriceService] No price data for ${symbol}`);
      return null;
    }

    return price;
  }

  /**
   * Calculate USD value of a token amount
   * @param symbol Token symbol
   * @param amount Token amount
   * @returns USD value
   */
  static async calculateUSDValue(symbol: string, amount: number): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    if (!price) {
      console.warn(`[PriceService] Cannot calculate USD value for ${symbol} - no price data`);
      return 0;
    }
    
    return amount * price.price;
  }

  /**
   * Convert amount from one currency to another via USD
   * @param fromCurrency Source currency
   * @param toCurrency Target currency  
   * @param amount Amount to convert
   * @returns Conversion result
   */
  static async convertCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<CurrencyConversion | null> {
    const fromPrice = await this.getTokenPrice(fromCurrency);
    const toPrice = await this.getTokenPrice(toCurrency);
    
    if (!fromPrice || !toPrice) {
      console.warn(`[PriceService] Cannot convert ${fromCurrency} to ${toCurrency} - missing price data`);
      return null;
    }

    // Convert through USD: amount * fromPrice / toPrice
    const usdValue = amount * fromPrice.price;
    const convertedAmount = usdValue / toPrice.price;
    const exchangeRate = fromPrice.price / toPrice.price;

    return {
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      amount,
      convertedAmount: Number(convertedAmount.toFixed(6)),
      exchangeRate: Number(exchangeRate.toFixed(6))
    };
  }

  /**
   * Format currency amount with symbol
   * @param amount Numeric amount
   * @param currency Currency symbol
   * @returns Formatted string
   */
  static formatCurrencyAmount(amount: number, currency: string): string {
    const upperCurrency = currency.toUpperCase();
    const decimals = upperCurrency === 'AUSD' ? 2 : upperCurrency === 'SBTC' ? 8 : 4;
    return `${amount.toFixed(decimals)} ${upperCurrency}`;
  }

  /**
   * Format USD amount
   * @param amount USD amount
   * @returns Formatted USD string
   */
  static formatUSDAmount(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}

export default PriceService; 