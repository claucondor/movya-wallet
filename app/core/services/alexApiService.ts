/**
 * ALEX DEX API Service
 * Lightweight client for ALEX SDK API endpoints
 * Used instead of alex-sdk npm package due to peer dependency conflicts
 */

import {
  callReadOnlyFunction,
  contractPrincipalCV,
  uintCV,
  cvToJSON,
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

// ALEX API endpoints (from alex-sdk config)
const ALEX_SDK_API = 'https://alex-sdk-api.alexlab.co';

// ALEX AMM contract for quotes (v2)
const ALEX_AMM_CONTRACT = {
  address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
  name: 'amm-pool-v2-01',
};

// Pool factor (1e8)
const POOL_FACTOR = '100000000';

/**
 * Token info from ALEX API
 */
export interface AlexToken {
  id: string;
  name: string;
  icon: string;
  wrapToken: string;
  wrapTokenDecimals: number;
  underlyingToken: string;
  underlyingTokenDecimals: number;
  isRebaseToken: boolean;
  isVaultWrapToken: boolean;
}

/**
 * Pool info from ALEX API
 */
export interface AlexPool {
  poolId: number;
  tokenX: string;
  tokenY: string;
  factor: number;
}

/**
 * Cached ALEX data
 */
interface AlexData {
  pools: AlexPool[];
  tokens: AlexToken[];
  lastFetched: number;
}

let cachedData: AlexData | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch pool and token data from ALEX API
 */
async function fetchAlexData(): Promise<AlexData> {
  if (cachedData && (Date.now() - cachedData.lastFetched) < CACHE_DURATION) {
    return cachedData;
  }

  console.log('[AlexAPI] Fetching pool and token data...');

  const response = await fetch(ALEX_SDK_API);
  if (!response.ok) {
    throw new Error(`ALEX API error: ${response.status}`);
  }

  const data = await response.json();

  cachedData = {
    pools: data.pools || [],
    tokens: data.tokens || [],
    lastFetched: Date.now(),
  };

  console.log(`[AlexAPI] Loaded ${cachedData.pools.length} pools, ${cachedData.tokens.length} tokens`);
  return cachedData;
}

/**
 * Map user-friendly symbol to ALEX token ID
 */
function symbolToAlexTokenId(symbol: string): string {
  const mapping: Record<string, string> = {
    'STX': 'token-wstx',
    'ALEX': 'age000-governance-token',
    'ABTC': 'token-abtc',
    'AUSD': 'token-susdt',
    'USDA': 'token-susdt', // Alias for aUSD (legacy name)
    'SBTC': 'token-abtc', // Map sBTC to aBTC for ALEX
  };
  const upperSymbol = symbol.toUpperCase();
  if (mapping[upperSymbol]) {
    return mapping[upperSymbol];
  }
  // Return as-is if not found (might be a direct token-id)
  return symbol;
}

/**
 * Map ALEX token ID to user-friendly symbol
 */
function alexTokenIdToSymbol(tokenId: string): string {
  const mapping: Record<string, string> = {
    'token-wstx': 'STX',
    'age000-governance-token': 'ALEX',
    'token-abtc': 'aBTC',
    'token-susdt': 'aUSD',
  };
  return mapping[tokenId] || tokenId;
}

/**
 * Find direct pool between two tokens
 */
async function findDirectPool(fromTokenId: string, toTokenId: string): Promise<AlexPool | null> {
  const data = await fetchAlexData();

  for (const pool of data.pools) {
    if ((pool.tokenX === fromTokenId && pool.tokenY === toTokenId) ||
        (pool.tokenX === toTokenId && pool.tokenY === fromTokenId)) {
      return pool;
    }
  }

  return null;
}

/**
 * Find route between two tokens (supports 2-hop routes)
 */
export async function findRoute(fromSymbol: string, toSymbol: string): Promise<{
  route: string[];
  pools: AlexPool[];
  isMultiHop: boolean;
}> {
  const fromTokenId = symbolToAlexTokenId(fromSymbol);
  const toTokenId = symbolToAlexTokenId(toSymbol);

  console.log(`[AlexAPI] Finding route: ${fromSymbol} (${fromTokenId}) -> ${toSymbol} (${toTokenId})`);

  // Try direct pool first
  const directPool = await findDirectPool(fromTokenId, toTokenId);
  if (directPool) {
    console.log(`[AlexAPI] Found direct pool: ${directPool.poolId}`);
    return {
      route: [fromSymbol, toSymbol],
      pools: [directPool],
      isMultiHop: false,
    };
  }

  // Find 2-hop route via common intermediates
  const intermediates = ['token-wstx', 'age000-governance-token', 'token-abtc'];

  for (const intermediate of intermediates) {
    if (intermediate === fromTokenId || intermediate === toTokenId) continue;

    const pool1 = await findDirectPool(fromTokenId, intermediate);
    const pool2 = await findDirectPool(intermediate, toTokenId);

    if (pool1 && pool2) {
      const intermediateSymbol = alexTokenIdToSymbol(intermediate);
      console.log(`[AlexAPI] Found 2-hop route via ${intermediateSymbol}`);
      return {
        route: [fromSymbol, intermediateSymbol, toSymbol],
        pools: [pool1, pool2],
        isMultiHop: true,
      };
    }
  }

  throw new Error(`No route found for ${fromSymbol} -> ${toSymbol}`);
}

/**
 * Get token contract info from ALEX API
 */
export async function getTokenContract(symbol: string): Promise<{
  address: string;
  name: string;
  decimals: number;
} | null> {
  const data = await fetchAlexData();
  const tokenId = symbolToAlexTokenId(symbol);

  const token = data.tokens.find(t => t.id === tokenId);
  if (!token) return null;

  // Parse the wrapToken format: "ADDRESS.CONTRACT::asset"
  const [contractPart] = token.wrapToken.split('::');
  const [address, name] = contractPart.split('.');

  return {
    address,
    name,
    decimals: token.wrapTokenDecimals,
  };
}

/**
 * Get swap quote using ALEX contract read-only call
 */
export async function getSwapQuote(
  fromSymbol: string,
  toSymbol: string,
  amount: number
): Promise<{
  outputAmount: string;
  route: string[];
  exchangeRate: number;
  priceImpact: number;
}> {
  console.log(`[AlexAPI] Getting quote: ${amount} ${fromSymbol} -> ${toSymbol}`);

  // Get route
  const routeInfo = await findRoute(fromSymbol, toSymbol);

  // Get token contracts
  const fromToken = await getTokenContract(fromSymbol);
  const toToken = await getTokenContract(toSymbol);

  if (!fromToken || !toToken) {
    throw new Error(`Token contract not found for ${fromSymbol} or ${toSymbol}`);
  }

  // Convert amount to base units (ALEX uses 1e8 for all tokens)
  const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, 8)));

  const network = new StacksMainnet();
  let outputAmountBigInt: bigint;

  if (routeInfo.isMultiHop) {
    // 2-hop swap using get-helper-a
    const midToken = await getTokenContract(routeInfo.route[1]);
    if (!midToken) {
      throw new Error(`Intermediate token contract not found: ${routeInfo.route[1]}`);
    }

    console.log(`[AlexAPI] Calling get-helper-a for 2-hop swap`);
    console.log(`  From: ${fromToken.address}.${fromToken.name}`);
    console.log(`  Mid: ${midToken.address}.${midToken.name}`);
    console.log(`  To: ${toToken.address}.${toToken.name}`);

    const result = await callReadOnlyFunction({
      contractAddress: ALEX_AMM_CONTRACT.address,
      contractName: ALEX_AMM_CONTRACT.name,
      functionName: 'get-helper-a',
      functionArgs: [
        contractPrincipalCV(fromToken.address, fromToken.name),
        contractPrincipalCV(midToken.address, midToken.name),
        contractPrincipalCV(toToken.address, toToken.name),
        uintCV(POOL_FACTOR),
        uintCV(POOL_FACTOR),
        uintCV(amountInBaseUnits.toString()),
      ],
      network,
      senderAddress: ALEX_AMM_CONTRACT.address,
    });

    const resultJSON = cvToJSON(result);
    console.log('[AlexAPI] Result:', JSON.stringify(resultJSON, null, 2));

    if (resultJSON.success === false) {
      throw new Error(`Contract error: ${JSON.stringify(resultJSON.value)}`);
    }

    outputAmountBigInt = BigInt(resultJSON.value?.value || resultJSON.value || 0);
  } else {
    // Direct swap using get-helper
    console.log(`[AlexAPI] Calling get-helper for direct swap`);
    console.log(`  From: ${fromToken.address}.${fromToken.name}`);
    console.log(`  To: ${toToken.address}.${toToken.name}`);

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
    console.log('[AlexAPI] Result:', JSON.stringify(resultJSON, null, 2));

    if (resultJSON.success === false) {
      throw new Error(`Contract error: ${JSON.stringify(resultJSON.value)}`);
    }

    outputAmountBigInt = BigInt(resultJSON.value?.value || resultJSON.value || 0);
  }

  if (outputAmountBigInt === BigInt(0)) {
    throw new Error('Got zero output from quote');
  }

  // Convert output to human-readable format
  const outputAmount = Number(outputAmountBigInt) / Math.pow(10, 8);
  const exchangeRate = outputAmount / amount;

  // Simple price impact estimation
  const priceImpact = routeInfo.isMultiHop ? 0.5 : 0.3; // Placeholder

  return {
    outputAmount: outputAmount.toFixed(8),
    route: routeInfo.route,
    exchangeRate,
    priceImpact,
  };
}

/**
 * Get all available swap pairs
 */
export async function getAvailablePairs(): Promise<Array<{ from: string; to: string }>> {
  const data = await fetchAlexData();
  const pairs: Array<{ from: string; to: string }> = [];
  const seenPairs = new Set<string>();

  for (const pool of data.pools) {
    const fromSymbol = alexTokenIdToSymbol(pool.tokenX);
    const toSymbol = alexTokenIdToSymbol(pool.tokenY);

    // Only include pairs with known symbols
    if (fromSymbol !== pool.tokenX && toSymbol !== pool.tokenY) {
      const key1 = `${fromSymbol}-${toSymbol}`;
      const key2 = `${toSymbol}-${fromSymbol}`;

      if (!seenPairs.has(key1)) {
        pairs.push({ from: fromSymbol, to: toSymbol });
        pairs.push({ from: toSymbol, to: fromSymbol });
        seenPairs.add(key1);
        seenPairs.add(key2);
      }
    }
  }

  return pairs;
}

export default {
  findRoute,
  getSwapQuote,
  getTokenContract,
  getAvailablePairs,
};
