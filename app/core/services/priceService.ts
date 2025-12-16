import Constants from 'expo-constants';
import { STACKS_MAINNET_TOKENS } from '../constants/tokens';

export interface TokenPrice {
  symbol: string;
  price: number; // Price in USD
  change24h: number; // Percentage change in 24h
  lastUpdated: number; // Timestamp
}

// Backend URL from config
const configuredUrl = Constants.expoConfig?.extra?.backendUrl;
const BACKEND_URL = configuredUrl || 'http://localhost:8080';

/**
 * Price Service for Stacks tokens
 * Fetches prices from backend which caches them in Firestore
 * Backend uses ALEX DEX data for real prices
 */
class PriceService {
  // Local cache duration (short, since backend handles longer caching)
  private static readonly LOCAL_CACHE_DURATION = 30 * 1000; // 30 seconds

  // Price cache to reduce API calls
  private static priceCache: Map<string, { data: TokenPrice; timestamp: number }> = new Map();

  // Full prices cache (all tokens at once)
  private static allPricesCache: { data: TokenPrice[]; timestamp: number } | null = null;

  /**
   * Get all token prices from backend (cached in Firestore)
   * @returns Array of price data for all supported tokens
   */
  static async getAllPrices(): Promise<TokenPrice[]> {
    try {
      // Check local cache first
      if (this.allPricesCache && (Date.now() - this.allPricesCache.timestamp) < this.LOCAL_CACHE_DURATION) {
        console.log('[PriceService] Using local cached prices');
        return this.allPricesCache.data;
      }

      console.log('[PriceService] Fetching prices from backend...');
      const response = await fetch(`${BACKEND_URL}/prices`);

      if (!response.ok) {
        console.error(`[PriceService] Backend error: ${response.status}`);
        return this.getFallbackPrices();
      }

      const result = await response.json();

      if (!result.success || !result.prices) {
        console.error('[PriceService] Invalid response from backend');
        return this.getFallbackPrices();
      }

      const prices: TokenPrice[] = result.prices;

      // Update local cache
      this.allPricesCache = {
        data: prices,
        timestamp: Date.now(),
      };

      // Also update individual price cache
      for (const price of prices) {
        this.priceCache.set(price.symbol.toUpperCase(), {
          data: price,
          timestamp: Date.now(),
        });
      }

      console.log(`[PriceService] Got ${prices.length} prices from backend (cached: ${result.cached})`);
      return prices;
    } catch (error: any) {
      console.error('[PriceService] Error fetching prices from backend:', error);
      return this.getFallbackPrices();
    }
  }

  /**
   * Get price for a specific token
   * @param symbol Token symbol (e.g., 'STX', 'sBTC', 'aUSD', 'ALEX')
   * @returns Price data or null if not found
   */
  static async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    try {
      let upperSymbol = symbol.toUpperCase();

      // Normalize aliases
      if (upperSymbol === 'USDA') upperSymbol = 'AUSD';

      // Check local cache first
      const cached = this.priceCache.get(upperSymbol);
      if (cached && (Date.now() - cached.timestamp) < this.LOCAL_CACHE_DURATION) {
        console.log(`[PriceService] Using cached price for ${symbol}`);
        return cached.data;
      }

      // Fetch all prices (backend caches efficiently)
      const prices = await this.getAllPrices();

      // Find price, also check for aUSD alias
      const price = prices.find(p => {
        const pSymbol = p.symbol.toUpperCase();
        return pSymbol === upperSymbol ||
               (upperSymbol === 'AUSD' && pSymbol === 'AUSD');
      });

      if (!price) {
        console.warn(`[PriceService] No price data for ${symbol}`);
        return null;
      }

      return price;
    } catch (error: any) {
      console.error(`[PriceService] Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens
   * @param symbols Array of token symbols
   * @returns Array of price data
   */
  static async getTokenPrices(symbols: string[]): Promise<TokenPrice[]> {
    try {
      // Fetch all prices (backend caches efficiently)
      const allPrices = await this.getAllPrices();

      // Filter to requested symbols
      const upperSymbols = symbols.map(s => s.toUpperCase());
      return allPrices.filter(p => upperSymbols.includes(p.symbol.toUpperCase()));
    } catch (error: any) {
      console.error('[PriceService] Error fetching multiple prices:', error);
      return [];
    }
  }

  /**
   * Get prices for all Stacks tokens
   * @returns Array of price data for all supported tokens
   */
  static async getAllStacksPrices(): Promise<TokenPrice[]> {
    const symbols = STACKS_MAINNET_TOKENS.map(token => token.symbol);
    return this.getTokenPrices(symbols);
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
   * Fallback prices when backend is unavailable
   */
  private static getFallbackPrices(): TokenPrice[] {
    console.warn('[PriceService] Using fallback prices');
    return [
      { symbol: 'STX', price: 0.80, change24h: 0, lastUpdated: Date.now() },
      { symbol: 'sBTC', price: 100000, change24h: 0, lastUpdated: Date.now() },
      { symbol: 'aUSD', price: 1.00, change24h: 0, lastUpdated: Date.now() },
      { symbol: 'ALEX', price: 0.004, change24h: 0, lastUpdated: Date.now() },
    ];
  }

  /**
   * Clear price cache (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    this.priceCache.clear();
    this.allPricesCache = null;
    console.log('[PriceService] Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; tokens: string[] } {
    return {
      size: this.priceCache.size,
      tokens: Array.from(this.priceCache.keys()),
    };
  }
}

export default PriceService;
