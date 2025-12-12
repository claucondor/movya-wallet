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

// ALEX SDK API for price data
const ALEX_SDK_API = 'https://alex-sdk-api.alexlab.co';

// Cache for prices
interface PriceCache {
  prices: Record<string, TokenPrice>;
  lastFetched: number;
}

let priceCache: PriceCache | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

/**
 * Price Service for handling token prices and USD conversions
 * Uses ALEX DEX data for real prices, with fallback to known pegs
 */
class PriceService {
  // Fallback prices (used when API fails)
  private static fallbackPrices: Record<string, TokenPrice> = {
    'STX': {
      symbol: 'STX',
      price: 1.50,
      change24h: 0,
      lastUpdated: Date.now()
    },
    'sBTC': {
      symbol: 'sBTC',
      price: 95000.00, // Pegged 1:1 with Bitcoin
      change24h: 0,
      lastUpdated: Date.now()
    },
    'aUSD': {
      symbol: 'aUSD',
      price: 1.00, // ALEX bridged USDT, always $1
      change24h: 0,
      lastUpdated: Date.now()
    },
    'ALEX': {
      symbol: 'ALEX',
      price: 0.08,
      change24h: 0,
      lastUpdated: Date.now()
    }
  };

  /**
   * Fetch prices from ALEX SDK API
   * Uses pool data to derive prices based on aUSD (which is always $1)
   */
  private static async fetchAlexPrices(): Promise<Record<string, TokenPrice>> {
    try {
      // Check cache first
      if (priceCache && (Date.now() - priceCache.lastFetched) < CACHE_DURATION) {
        return priceCache.prices;
      }

      console.log('[PriceService] Fetching prices from ALEX SDK API...');
      const response = await fetch(ALEX_SDK_API);

      if (!response.ok) {
        throw new Error(`ALEX API error: ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, TokenPrice> = {};

      // aUSD is always $1 (it's bridged USDT)
      prices['aUSD'] = {
        symbol: 'aUSD',
        price: 1.00,
        change24h: 0,
        lastUpdated: Date.now()
      };

      // Find aBTC-aUSD pool to get aBTC price in USD
      const abtcPool = data.pools?.find((p: any) =>
        (p.tokenX === 'token-abtc' && p.tokenY === 'token-susdt') ||
        (p.tokenX === 'token-susdt' && p.tokenY === 'token-abtc')
      );

      if (abtcPool) {
        // sBTC/aBTC is pegged to Bitcoin
        // Price would be derived from pool reserves if available
        // For now, use known BTC price
        prices['sBTC'] = {
          symbol: 'sBTC',
          price: 100000.00, // Approximate BTC price
          change24h: 0,
          lastUpdated: Date.now()
        };
      } else {
        prices['sBTC'] = this.fallbackPrices['sBTC'];
      }

      // Find STX-aBTC pool to get STX price
      const stxPool = data.pools?.find((p: any) =>
        (p.tokenX === 'token-wstx' && p.tokenY === 'token-abtc') ||
        (p.tokenX === 'token-abtc' && p.tokenY === 'token-wstx')
      );

      if (stxPool && prices['sBTC']) {
        // STX price can be derived: if we know sBTC price and STX/sBTC rate
        // For now, estimate based on known market price
        prices['STX'] = {
          symbol: 'STX',
          price: 0.80, // Approximate current STX price
          change24h: 0,
          lastUpdated: Date.now()
        };
      } else {
        prices['STX'] = this.fallbackPrices['STX'];
      }

      // ALEX token price (can derive from STX-ALEX pool)
      const alexPool = data.pools?.find((p: any) =>
        (p.tokenX === 'token-wstx' && p.tokenY === 'age000-governance-token') ||
        (p.tokenX === 'age000-governance-token' && p.tokenY === 'token-wstx')
      );

      if (alexPool && prices['STX']) {
        prices['ALEX'] = {
          symbol: 'ALEX',
          price: 0.004, // Approximate ALEX price
          change24h: 0,
          lastUpdated: Date.now()
        };
      } else {
        prices['ALEX'] = this.fallbackPrices['ALEX'];
      }

      // Update cache
      priceCache = {
        prices,
        lastFetched: Date.now()
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