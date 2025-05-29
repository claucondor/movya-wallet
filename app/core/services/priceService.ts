import { AVALANCHE_TOKENS } from '../constants/tokens';

export interface TokenPrice {
  symbol: string;
  price: number; // Price in USD
  change24h: number; // Percentage change in 24h
  lastUpdated: number; // Timestamp
}

/**
 * Mock Price Service
 * Returns simulated prices for tokens - NOT REAL PRICES
 * This is only for development/demo purposes
 */
class PriceService {
  private static mockPrices: Record<string, TokenPrice> = {
    'AVAX': {
      symbol: 'AVAX',
      price: 42.50,
      change24h: 2.34,
      lastUpdated: Date.now()
    },
    'USDC': {
      symbol: 'USDC',
      price: 1.00,
      change24h: 0.01,
      lastUpdated: Date.now()
    },
    'USDC.e': {
      symbol: 'USDC.e',
      price: 1.00,
      change24h: 0.01,
      lastUpdated: Date.now()
    }
  };

  /**
   * Get price for a specific token (MOCK DATA)
   * @param symbol Token symbol (e.g., 'AVAX', 'USDC')
   * @returns Mock price data
   */
  static async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const upperSymbol = symbol.toUpperCase();
    const mockPrice = this.mockPrices[upperSymbol];
    
    if (!mockPrice) {
      console.warn(`[PriceService] No mock price data for ${symbol}`);
      return null;
    }

    // Add small random variation to make it feel more "live"
    const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const adjustedPrice = mockPrice.price * (1 + randomVariation);
    
    return {
      ...mockPrice,
      price: Number(adjustedPrice.toFixed(mockPrice.symbol === 'USDC' || mockPrice.symbol === 'USDC.e' ? 4 : 2)),
      lastUpdated: Date.now()
    };
  }

  /**
   * Get prices for multiple tokens (MOCK DATA)
   * @param symbols Array of token symbols
   * @returns Array of mock price data
   */
  static async getTokenPrices(symbols: string[]): Promise<TokenPrice[]> {
    const pricePromises = symbols.map(symbol => this.getTokenPrice(symbol));
    const results = await Promise.all(pricePromises);
    
    return results.filter(price => price !== null) as TokenPrice[];
  }

  /**
   * Get prices for all Avalanche tokens (MOCK DATA)
   * @returns Array of mock price data for all supported tokens
   */
  static async getAllAvalanchePrices(): Promise<TokenPrice[]> {
    const symbols = AVALANCHE_TOKENS.map(token => token.symbol);
    return this.getTokenPrices(symbols);
  }

  /**
   * Calculate USD value of a token amount (using mock prices)
   * @param symbol Token symbol
   * @param amount Token amount
   * @returns USD value (mock calculation)
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
   * Update mock price (for testing purposes)
   * @param symbol Token symbol
   * @param newPrice New mock price
   */
  static updateMockPrice(symbol: string, newPrice: number): void {
    const upperSymbol = symbol.toUpperCase();
    if (this.mockPrices[upperSymbol]) {
      this.mockPrices[upperSymbol].price = newPrice;
      this.mockPrices[upperSymbol].lastUpdated = Date.now();
      console.log(`[PriceService] Updated mock price for ${symbol}: $${newPrice}`);
    }
  }
}

export default PriceService; 