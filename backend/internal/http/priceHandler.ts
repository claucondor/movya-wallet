import { Request, Response } from 'express';
import FirestoreService from '../firestore/firestoreService';
import PriceService, { TokenPrice } from '../services/priceService';

// Firestore collection for cached prices
const PRICES_COLLECTION = 'token_prices';
const PRICES_CACHE_DOC = 'current_prices';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedPrices {
  prices: TokenPrice[];
  lastUpdated: number;
}

/**
 * Get token prices with Firestore caching
 * Frontend requests prices from here, backend caches in Firestore
 */
export async function getPricesHandler(req: Request, res: Response): Promise<void> {
  try {
    console.log('[PriceHandler] Received price request');

    // Try to get cached prices from Firestore
    const cached = await FirestoreService.getDocument<CachedPrices>(
      PRICES_COLLECTION,
      PRICES_CACHE_DOC
    );

    const now = Date.now();

    // Check if cache is still valid
    if (cached && (now - cached.lastUpdated) < CACHE_TTL_MS) {
      console.log('[PriceHandler] Returning cached prices from Firestore');
      res.status(200).json({
        success: true,
        cached: true,
        cacheAge: Math.floor((now - cached.lastUpdated) / 1000),
        prices: cached.prices
      });
      return;
    }

    // Cache expired or doesn't exist - fetch fresh prices
    console.log('[PriceHandler] Cache expired or missing, fetching fresh prices...');

    // Get prices for all supported tokens
    const symbols = PriceService.getSupportedCurrencies();
    const prices: TokenPrice[] = [];

    for (const symbol of symbols) {
      const price = await PriceService.getTokenPrice(symbol);
      if (price) {
        prices.push(price);
      }
    }

    // Save to Firestore cache
    const newCache: CachedPrices = {
      prices,
      lastUpdated: now
    };

    await FirestoreService.setDocument(
      PRICES_COLLECTION,
      PRICES_CACHE_DOC,
      newCache,
      { merge: false } // Replace entire document
    );

    console.log(`[PriceHandler] Cached ${prices.length} prices to Firestore`);

    res.status(200).json({
      success: true,
      cached: false,
      prices
    });
  } catch (error: any) {
    console.error('[PriceHandler] Error getting prices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get prices'
    });
  }
}

/**
 * Get price for a specific token
 */
export async function getTokenPriceHandler(req: Request, res: Response): Promise<void> {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      res.status(400).json({
        success: false,
        error: 'Token symbol is required'
      });
      return;
    }

    console.log(`[PriceHandler] Getting price for ${symbol}`);

    // Check Firestore cache first
    const cached = await FirestoreService.getDocument<CachedPrices>(
      PRICES_COLLECTION,
      PRICES_CACHE_DOC
    );

    const now = Date.now();

    if (cached && (now - cached.lastUpdated) < CACHE_TTL_MS) {
      const cachedPrice = cached.prices.find(
        p => p.symbol.toUpperCase() === symbol.toUpperCase()
      );

      if (cachedPrice) {
        console.log(`[PriceHandler] Returning cached price for ${symbol}`);
        res.status(200).json({
          success: true,
          cached: true,
          price: cachedPrice
        });
        return;
      }
    }

    // Fetch fresh price
    const price = await PriceService.getTokenPrice(symbol);

    if (!price) {
      res.status(404).json({
        success: false,
        error: `Price not found for ${symbol}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      cached: false,
      price
    });
  } catch (error: any) {
    console.error('[PriceHandler] Error getting token price:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get token price'
    });
  }
}

/**
 * Convert amount between currencies
 */
export async function convertCurrencyHandler(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      res.status(400).json({
        success: false,
        error: 'from, to, and amount parameters are required'
      });
      return;
    }

    const numAmount = parseFloat(amount as string);
    if (isNaN(numAmount)) {
      res.status(400).json({
        success: false,
        error: 'amount must be a valid number'
      });
      return;
    }

    console.log(`[PriceHandler] Converting ${numAmount} ${from} to ${to}`);

    const conversion = await PriceService.convertCurrency(
      from as string,
      to as string,
      numAmount
    );

    if (!conversion) {
      res.status(400).json({
        success: false,
        error: `Cannot convert ${from} to ${to}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      conversion
    });
  } catch (error: any) {
    console.error('[PriceHandler] Error converting currency:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert currency'
    });
  }
}

/**
 * Calculate USD value of a token amount
 */
export async function calculateUsdValueHandler(req: Request, res: Response): Promise<void> {
  try {
    const { symbol, amount } = req.query;

    if (!symbol || !amount) {
      res.status(400).json({
        success: false,
        error: 'symbol and amount parameters are required'
      });
      return;
    }

    const numAmount = parseFloat(amount as string);
    if (isNaN(numAmount)) {
      res.status(400).json({
        success: false,
        error: 'amount must be a valid number'
      });
      return;
    }

    console.log(`[PriceHandler] Calculating USD value for ${numAmount} ${symbol}`);

    const usdValue = await PriceService.calculateUSDValue(symbol as string, numAmount);

    res.status(200).json({
      success: true,
      symbol,
      amount: numAmount,
      usdValue,
      formatted: PriceService.formatUSDAmount(usdValue)
    });
  } catch (error: any) {
    console.error('[PriceHandler] Error calculating USD value:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate USD value'
    });
  }
}
