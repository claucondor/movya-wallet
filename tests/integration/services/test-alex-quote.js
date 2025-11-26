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

// ALEX AMM Pool contract
const ALEX_CONTRACT = {
  address: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9',
  name: 'amm-swap-pool-v1-1',
};

// Token contracts
const TOKENS = {
  'wSTX': {
    address: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9',
    name: 'token-wstx',
    decimals: 6,
  },
  'USDA': {
    address: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR',
    name: 'usda-token',
    decimals: 6,
  },
  'sBTC': {
    address: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4',
    name: 'sbtc-token',
    decimals: 8,
  },
};

async function testALEXQuote(fromToken, toToken, amount) {
  console.log(`\n=== Testing ALEX Quote: ${amount} ${fromToken} → ${toToken} ===`);

  try {
    const fromInfo = TOKENS[fromToken];
    const toInfo = TOKENS[toToken];

    if (!fromInfo || !toInfo) {
      throw new Error(`Unknown token: ${fromToken} or ${toToken}`);
    }

    // Convert amount to base units
    const amountInBaseUnits = BigInt(Math.floor(amount * Math.pow(10, fromInfo.decimals)));
    console.log(`Amount in base units: ${amountInBaseUnits.toString()}`);

    // Prepare function arguments
    const functionArgs = [
      contractPrincipalCV(fromInfo.address, fromInfo.name),
      contractPrincipalCV(toInfo.address, toInfo.name),
      uintCV(amountInBaseUnits.toString()),
    ];

    console.log('Calling ALEX contract read-only function...');
    console.log(`Contract: ${ALEX_CONTRACT.address}.${ALEX_CONTRACT.name}`);
    console.log(`Function: get-helper`);

    // Call read-only function
    const network = new StacksMainnet();
    const senderAddress = ALEX_CONTRACT.address; // Use contract address as sender

    const result = await callReadOnlyFunction({
      contractAddress: ALEX_CONTRACT.address,
      contractName: ALEX_CONTRACT.name,
      functionName: 'get-helper',
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

  // Test multiple swap pairs
  const tests = [
    ['wSTX', 'USDA', 10],     // 10 STX → USDA
    ['wSTX', 'USDA', 100],    // 100 STX → USDA
    ['USDA', 'wSTX', 10],     // 10 USDA → STX
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const [from, to, amount] of tests) {
    const passed = await testALEXQuote(from, to, amount);
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
