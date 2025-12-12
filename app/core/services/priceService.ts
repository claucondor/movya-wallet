import { STACKS_MAINNET_TOKENS } from '../constants/tokens';

export interface TokenPrice {
  symbol: string;
  price: number; // Price in USD
  change24h: number; // Percentage change in 24h
  lastUpdated: number; // Timestamp
}

/**
 * Real Price Service for Stacks using CoinGecko API
 * Fetches live prices for STX, sBTC, USDA tokens
 */
class PriceService {
  private static readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private static readonly CACHE_DURATION = 60 * 1000; // 1 minute cache

  // Map Stacks symbols to CoinGecko IDs
  private static readonly COINGECKO_IDS: Record<string, string> = {
    'STX': 'stacks',
    'sBTC': 'bitcoin', // Use bitcoin price for sBTC
    'aUSD': 'tether',  // aUSD is pegged to USD, use tether as proxy
    'ALEX': 'alexgo',  // ALEX DEX governance token
  };

  // Price cache to reduce API calls
  private static priceCache: Map<string, { data: TokenPrice; timestamp: number }> = new Map();

  /**
   * Get price for a specific token from CoinGecko
   * @param symbol Token symbol (e.g., 'STX', 'sBTC', 'USDA')
   * @returns Real price data from CoinGecko
   */
  static async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const coingeckoId = this.COINGECKO_IDS[upperSymbol];

      if (!coingeckoId) {
        console.warn(`[PriceService] No CoinGecko ID mapping for ${symbol}`);
        return null;
      }

      // Check cache first
      const cached = this.priceCache.get(upperSymbol);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log(`[PriceService] Using cached price for ${symbol}`);
        return cached.data;
      }

      // Fetch from CoinGecko API
      console.log(`[PriceService] Fetching live price for ${symbol} from CoinGecko...`);
      const url = `${this.COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[PriceService] CoinGecko API error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data[coingeckoId]) {
        console.error(`[PriceService] No price data for ${coingeckoId}`);
        return null;
      }

      const tokenData = data[coingeckoId];
      const tokenPrice: TokenPrice = {
        symbol: upperSymbol,
        price: tokenData.usd || 0,
        change24h: tokenData.usd_24h_change || 0,
        lastUpdated: Date.now(),
      };

      // Cache the result
      this.priceCache.set(upperSymbol, {
        data: tokenPrice,
        timestamp: Date.now(),
      });

      console.log(`[PriceService] ${symbol}: $${tokenPrice.price} (${tokenPrice.change24h.toFixed(2)}%)`);
      return tokenPrice;
    } catch (error: any) {
      console.error(`[PriceService] Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens from CoinGecko
   * @param symbols Array of token symbols
   * @returns Array of real price data
   */
  static async getTokenPrices(symbols: string[]): Promise<TokenPrice[]> {
    try {
      // Filter symbols that have CoinGecko IDs
      const validSymbols = symbols.filter(s => this.COINGECKO_IDS[s.toUpperCase()]);

      if (validSymbols.length === 0) {
        console.warn('[PriceService] No valid symbols provided');
        return [];
      }

      // Build CoinGecko IDs string
      const ids = validSymbols
        .map(s => this.COINGECKO_IDS[s.toUpperCase()])
        .join(',');

      // Fetch all prices in one API call
      console.log(`[PriceService] Fetching prices for ${validSymbols.length} tokens from CoinGecko...`);
      const url = `${this.COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[PriceService] CoinGecko API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const prices: TokenPrice[] = [];

      for (const symbol of validSymbols) {
        const upperSymbol = symbol.toUpperCase();
        const coingeckoId = this.COINGECKO_IDS[upperSymbol];
        const tokenData = data[coingeckoId];

        if (tokenData) {
          const tokenPrice: TokenPrice = {
            symbol: upperSymbol,
            price: tokenData.usd || 0,
            change24h: tokenData.usd_24h_change || 0,
            lastUpdated: Date.now(),
          };

          prices.push(tokenPrice);

          // Cache the result
          this.priceCache.set(upperSymbol, {
            data: tokenPrice,
            timestamp: Date.now(),
          });
        }
      }

      console.log(`[PriceService] Successfully fetched ${prices.length} prices`);
      return prices;
    } catch (error: any) {
      console.error('[PriceService] Error fetching multiple prices:', error);
      return [];
    }
  }

  /**
   * Get prices for all Stacks tokens
   * @returns Array of real price data for all supported tokens
   */
  static async getAllStacksPrices(): Promise<TokenPrice[]> {
    const symbols = STACKS_MAINNET_TOKENS.map(token => token.symbol);
    return this.getTokenPrices(symbols);
  }

  /**
   * Calculate USD value of a token amount (using real prices)
   * @param symbol Token symbol
   * @param amount Token amount
   * @returns USD value (real calculation)
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
   * Clear price cache (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    this.priceCache.clear();
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
