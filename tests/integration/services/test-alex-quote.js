#!/usr/bin/env node

/**
 * Test script to verify ALEX DEX read-only contract calls
 * Tests if we can get real swap quotes from the contract
 */

const {
  callReadOnlyFunction,
  contractPrincipalCV,
  uintCV,
  cvToJSON,
} = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');

// ALEX AMM Pool contract v2 (current mainnet contract)
const ALEX_CONTRACT = {
  address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
  name: 'amm-pool-v2-01',
};

// Token contracts - Using ALEX wrapped tokens (v2 versions for swaps)
const TOKENS = {
  'wSTX': {
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    name: 'token-wstx-v2',
    decimals: 8, // wSTX v2 uses 8 decimals
  },
  'aUSD': {
    address: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    name: 'token-susdt',
    decimals: 8,
  },
  'aBTC': {
    address: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    name: 'token-abtc',
    decimals: 8,
  },
  'ALEX': {
    address: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    name: 'token-alex',
    decimals: 8,
  },
};

async function testALEXQuote(fromToken, toToken, amount, intermediateToken = null) {
  const routeStr = intermediateToken
    ? `${fromToken} → ${intermediateToken} → ${toToken}`
    : `${fromToken} → ${toToken}`;
  console.log(`\n=== Testing ALEX Quote: ${amount} ${routeStr} ===`);

  try {
    const fromInfo = TOKENS[fromToken];
    const toInfo = TOKENS[toToken];
    const midInfo = intermediateToken ? TOKENS[intermediateToken] : null;

    if (!fromInfo || !toInfo) {
      throw new Error(`Unknown token: ${fromToken} or ${toToken}`);
    }

    // Convert amount to base units
    const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, fromInfo.decimals)));
    console.log(`Amount in base units: ${amountInBaseUnits.toString()}`);

    // Factor is typically 100000000 (1e8) for standard ALEX pools
    const POOL_FACTOR = '100000000';

    let functionName, functionArgs;

    if (intermediateToken && midInfo) {
      // 2-hop swap using get-helper-a
      functionName = 'get-helper-a';
      functionArgs = [
        contractPrincipalCV(fromInfo.address, fromInfo.name),  // token-x
        contractPrincipalCV(midInfo.address, midInfo.name),    // token-y (intermediate)
        contractPrincipalCV(toInfo.address, toInfo.name),      // token-z
        uintCV(POOL_FACTOR),  // factor-x (pool X-Y)
        uintCV(POOL_FACTOR),  // factor-y (pool Y-Z)
        uintCV(amountInBaseUnits.toString()),  // dx
      ];
    } else {
      // Direct swap using get-helper
      functionName = 'get-helper';
      functionArgs = [
        contractPrincipalCV(fromInfo.address, fromInfo.name),
        contractPrincipalCV(toInfo.address, toInfo.name),
        uintCV(POOL_FACTOR),
        uintCV(amountInBaseUnits.toString()),
      ];
    }

    console.log('Calling ALEX contract read-only function...');
    console.log(`Contract: ${ALEX_CONTRACT.address}.${ALEX_CONTRACT.name}`);
    console.log(`Function: ${functionName}`);

    // Call read-only function
    const network = new StacksMainnet();
    const senderAddress = ALEX_CONTRACT.address; // Use contract address as sender

    const result = await callReadOnlyFunction({
      contractAddress: ALEX_CONTRACT.address,
      contractName: ALEX_CONTRACT.name,
      functionName,
      functionArgs,
      network,
      senderAddress,
    });

    // Parse result
    const resultJSON = cvToJSON(result);
    console.log('\nRaw result:', JSON.stringify(resultJSON, null, 2));

    // Try to extract output amount
    let outputAmount = 0;
    if (resultJSON.value && typeof resultJSON.value === 'object') {
      if (resultJSON.value.dy) {
        outputAmount = BigInt(resultJSON.value.dy);
      } else if (resultJSON.value.value) {
        outputAmount = BigInt(resultJSON.value.value);
      }
    } else if (resultJSON.value) {
      outputAmount = BigInt(resultJSON.value);
    }

    if (outputAmount && outputAmount > 0) {
      const outputFormatted = Number(outputAmount) / Math.pow(10, toInfo.decimals);
      console.log(`\n✅ SUCCESS!`);
      console.log(`Output: ${outputFormatted.toFixed(toInfo.decimals)} ${toToken}`);
      console.log(`Exchange rate: 1 ${fromToken} = ${(outputFormatted / amount).toFixed(8)} ${toToken}`);
      return true;
    } else {
      console.log('\n❌ FAILED: Got zero or invalid output');
      return false;
    }

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log('Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     ALEX DEX Read-Only Contract Call Test Script      ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Test multiple swap pairs - using tokens that have pools on ALEX
  const tests = [
    // Direct swaps
    { from: 'wSTX', to: 'ALEX', amount: 10, intermediate: null },      // 10 STX → ALEX
    { from: 'wSTX', to: 'aBTC', amount: 10, intermediate: null },      // 10 STX → aBTC
    { from: 'aBTC', to: 'aUSD', amount: 0.0001, intermediate: null },  // aBTC → aUSD
    // Multi-hop swap: STX → aBTC → aUSD
    { from: 'wSTX', to: 'aUSD', amount: 10, intermediate: 'aBTC' },    // 10 STX → aUSD via aBTC
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const { from, to, amount, intermediate } of tests) {
    const passed = await testALEXQuote(from, to, amount, intermediate);
    if (passed) passedTests++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('✅ All tests passed! Contract calls are working.');
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
