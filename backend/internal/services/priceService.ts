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

/**
 * Price Service for handling token prices and USD conversions
 * Uses mock prices for development - replace with real API in production
 */
class PriceService {
  private static mockPrices: Record<string, TokenPrice> = {
    'STX': {
      symbol: 'STX',
      price: 1.50,
      change24h: 3.45,
      lastUpdated: Date.now()
    },
    'sBTC': {
      symbol: 'sBTC',
      price: 95000.00, // Pegged 1:1 with Bitcoin
      change24h: 1.23,
      lastUpdated: Date.now()
    },
    'USDA': {
      symbol: 'USDA',
      price: 1.00,
      change24h: 0.02,
      lastUpdated: Date.now()
    }
  };

  /**
   * Get available currencies that the system supports
   * @returns Array of supported currency symbols
   */
  static getSupportedCurrencies(): string[] {
    return Object.keys(this.mockPrices);
  }

  /**
   * Check if a currency is supported
   * @param currency Currency symbol to check
   * @returns Boolean indicating support
   */
  static isCurrencySupported(currency: string): boolean {
    return this.getSupportedCurrencies().includes(currency.toUpperCase());
  }

  /**
   * Get price for a specific token
   * @param symbol Token symbol (e.g., 'AVAX', 'USDC', 'WAVAX')
   * @returns Price data or null if not found
   */
  static async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const upperSymbol = symbol.toUpperCase();
    let mockPrice = this.mockPrices[upperSymbol];
    
    // Handle sBTC specifically - should always track Bitcoin price
    if (upperSymbol === 'SBTC' && !mockPrice) {
      mockPrice = this.mockPrices['sBTC'];
    }
    
    if (!mockPrice) {
      console.warn(`[PriceService] No price data for ${symbol}`);
      return null;
    }

    // Add small random variation to make it feel more "live"
    const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const adjustedPrice = mockPrice.price * (1 + randomVariation);
    
    return {
      ...mockPrice,
      price: Number(adjustedPrice.toFixed(mockPrice.symbol === 'USDA' ? 4 : mockPrice.symbol === 'sBTC' ? 2 : 2)),
      lastUpdated: Date.now()
    };
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
    const decimals = upperCurrency === 'USDA' ? 2 : upperCurrency === 'sBTC' ? 8 : 4;
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