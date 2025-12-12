#!/usr/bin/env node

/**
 * Test script to verify ALEX API Service
 * Tests route finding and quote fetching
 */

const {
  callReadOnlyFunction,
  contractPrincipalCV,
  uintCV,
  cvToJSON,
} = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');

// ALEX API endpoints
const ALEX_SDK_API = 'https://alex-sdk-api.alexlab.co';

// ALEX AMM contract for quotes (v2)
const ALEX_AMM_CONTRACT = {
  address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
  name: 'amm-pool-v2-01',
};

const POOL_FACTOR = '100000000';

// Symbol to ALEX token ID mapping
const symbolToAlexTokenId = (symbol) => {
  const mapping = {
    'STX': 'token-wstx',
    'ALEX': 'age000-governance-token',
    'ABTC': 'token-abtc',
    'AUSD': 'token-susdt',
    'SBTC': 'token-abtc', // Map sBTC to aBTC
  };
  const upperSymbol = symbol.toUpperCase();
  if (mapping[upperSymbol]) {
    return mapping[upperSymbol];
  }
  // Return as-is if not found (might be a direct token-id)
  return symbol;
};

// ALEX token ID to symbol mapping
const alexTokenIdToSymbol = (tokenId) => {
  const mapping = {
    'token-wstx': 'STX',
    'age000-governance-token': 'ALEX',
    'token-abtc': 'aBTC',
    'token-susdt': 'aUSD',
  };
  return mapping[tokenId] || tokenId;
};

// Fetch ALEX pool and token data
async function fetchAlexData() {
  console.log('[AlexAPI] Fetching pool and token data...');
  const response = await fetch(ALEX_SDK_API);
  if (!response.ok) {
    throw new Error(`ALEX API error: ${response.status}`);
  }
  const data = await response.json();
  console.log(`[AlexAPI] Loaded ${data.pools.length} pools, ${data.tokens.length} tokens`);
  return data;
}

// Find direct pool between two tokens
function findDirectPool(pools, fromTokenId, toTokenId) {
  for (const pool of pools) {
    if ((pool.tokenX === fromTokenId && pool.tokenY === toTokenId) ||
        (pool.tokenX === toTokenId && pool.tokenY === fromTokenId)) {
      return pool;
    }
  }
  return null;
}

// Find route between two tokens
async function findRoute(fromSymbol, toSymbol) {
  const fromTokenId = symbolToAlexTokenId(fromSymbol);
  const toTokenId = symbolToAlexTokenId(toSymbol);

  console.log(`\n[AlexAPI] Finding route: ${fromSymbol} (${fromTokenId}) -> ${toSymbol} (${toTokenId})`);

  const data = await fetchAlexData();

  // Try direct pool first
  const directPool = findDirectPool(data.pools, fromTokenId, toTokenId);
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

    const pool1 = findDirectPool(data.pools, fromTokenId, intermediate);
    const pool2 = findDirectPool(data.pools, intermediate, toTokenId);

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

// Get token contract info from ALEX API
async function getTokenContract(symbol) {
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

// Get swap quote using ALEX contract
async function getSwapQuote(fromSymbol, toSymbol, amount) {
  console.log(`\n=== Getting Quote: ${amount} ${fromSymbol} -> ${toSymbol} ===`);

  try {
    // Get route
    const routeInfo = await findRoute(fromSymbol, toSymbol);
    console.log(`Route: ${routeInfo.route.join(' → ')}`);

    // Get token contracts
    const fromToken = await getTokenContract(fromSymbol);
    const toToken = await getTokenContract(toSymbol);

    if (!fromToken || !toToken) {
      throw new Error(`Token contract not found for ${fromSymbol} or ${toSymbol}`);
    }

    console.log(`From token: ${fromToken.address}.${fromToken.name}`);
    console.log(`To token: ${toToken.address}.${toToken.name}`);

    // Convert amount to base units (ALEX uses 1e8 for all tokens)
    const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, 8)));
    console.log(`Amount in base units: ${amountInBaseUnits.toString()}`);

    const network = new StacksMainnet();
    let result;

    if (routeInfo.isMultiHop) {
      // 2-hop swap using get-helper-a
      const midToken = await getTokenContract(routeInfo.route[1]);
      if (!midToken) {
        throw new Error(`Intermediate token contract not found: ${routeInfo.route[1]}`);
      }

      console.log(`Mid token: ${midToken.address}.${midToken.name}`);
      console.log('Calling get-helper-a for 2-hop swap...');

      result = await callReadOnlyFunction({
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
    } else {
      // Direct swap using get-helper
      console.log('Calling get-helper for direct swap...');

      result = await callReadOnlyFunction({
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
    }

    const resultJSON = cvToJSON(result);
    console.log('Raw result:', JSON.stringify(resultJSON, null, 2));

    if (resultJSON.success === false) {
      throw new Error(`Contract error: ${JSON.stringify(resultJSON.value)}`);
    }

    const outputAmountBigInt = BigInt(resultJSON.value?.value || resultJSON.value || 0);

    if (outputAmountBigInt === BigInt(0)) {
      throw new Error('Got zero output from quote');
    }

    // Convert output to human-readable format
    const outputAmount = Number(outputAmountBigInt) / Math.pow(10, 8);
    const exchangeRate = outputAmount / amount;

    console.log(`\n✅ SUCCESS!`);
    console.log(`Output: ${outputAmount.toFixed(8)} ${toSymbol}`);
    console.log(`Exchange rate: 1 ${fromSymbol} = ${exchangeRate.toFixed(8)} ${toSymbol}`);

    return {
      outputAmount: outputAmount.toFixed(8),
      route: routeInfo.route,
      exchangeRate,
    };
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        ALEX API Service Integration Test               ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Test cases
  const tests = [
    { from: 'STX', to: 'ALEX', amount: 10 },     // Direct pool
    { from: 'STX', to: 'aBTC', amount: 10 },     // Direct pool
    { from: 'aBTC', to: 'aUSD', amount: 0.0001 }, // Direct pool
    { from: 'STX', to: 'aUSD', amount: 10 },     // 2-hop: STX -> aBTC -> aUSD
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const { from, to, amount } of tests) {
    try {
      await getSwapQuote(from, to, amount);
      passedTests++;
    } catch (error) {
      // Error already logged
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('✅ All tests passed! ALEX API integration is working.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
