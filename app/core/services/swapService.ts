import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardFungiblePostCondition,
  createAssetInfo,
  contractPrincipalCV,
  uintCV,
  someCV,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { getWalletAddress, getPrivateKey } from '../../internal/walletService';
import PriceService from './priceService';
import { getSwapQuote as getAlexQuote, findRoute } from './alexApiService';

/**
 * Supported DEX protocols on Stacks
 */
export enum DEXProtocol {
  ALEX = 'ALEX',
  ARKADIKO = 'ARKADIKO',
}

/**
 * DEX contract configuration
 */
interface DEXConfig {
  protocol: DEXProtocol;
  contractAddress: string;
  contractName: string;
  swapFunctionName: string;
}

/**
 * Token configuration for swaps
 */
interface SwapToken {
  symbol: string;
  contractAddress: string;
  contractName: string;
  decimals: number;
  isNative: boolean;
}

/**
 * Swap quote information
 */
export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  inputToken: string;
  outputToken: string;
  priceImpact: number;
  minimumReceived: string;
  exchangeRate: string;
  protocol: DEXProtocol;
  route: string[];
  // Legacy properties for backward compatibility with UI
  amountOut: string;
  amountOutMin: string;
  toToken: string;
  gasEstimateUSD: string;
}

/**
 * Swap result after execution
 */
export interface SwapResult {
  success: boolean;
  txId?: string;
  error?: string;
  explorerUrl?: string;
  // Legacy properties for backward compatibility with UI
  amountIn?: string;
  fromToken?: string;
  amountOut?: string;
  toToken?: string;
  transactionHash?: string; // Alias for txId
  gasUsed?: bigint;
}

/**
 * DEX configurations for Stacks mainnet
 * Using ALEX AMM v2 contract for all swaps
 */
const DEX_CONFIGS: Record<DEXProtocol, DEXConfig> = {
  [DEXProtocol.ALEX]: {
    protocol: DEXProtocol.ALEX,
    contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contractName: 'amm-pool-v2-01',
    swapFunctionName: 'swap-helper', // For direct swaps
  },
  [DEXProtocol.ARKADIKO]: {
    protocol: DEXProtocol.ARKADIKO,
    contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR',
    contractName: 'arkadiko-swap-v2-1',
    swapFunctionName: 'swap-x-for-y',
  },
};

// Pool factor for ALEX (1e8)
const ALEX_POOL_FACTOR = '100000000';

/**
 * Token contracts for swaps (Mainnet) - Using ALEX wrapped tokens
 */
const SWAP_TOKENS: Record<string, SwapToken> = {
  'STX': {
    symbol: 'STX',
    contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contractName: 'token-wstx',
    decimals: 8, // ALEX uses 8 decimals
    isNative: true,
  },
  'sBTC': {
    symbol: 'sBTC',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-abtc',
    decimals: 8,
    isNative: false,
  },
  'SBTC': {
    // Uppercase alias for sBTC
    symbol: 'sBTC',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-abtc',
    decimals: 8,
    isNative: false,
  },
  'aBTC': {
    symbol: 'aBTC',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-abtc',
    decimals: 8,
    isNative: false,
  },
  'ABTC': {
    // Uppercase alias for aBTC
    symbol: 'aBTC',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-abtc',
    decimals: 8,
    isNative: false,
  },
  'aUSD': {
    symbol: 'aUSD',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-susdt',
    decimals: 8,
    isNative: false,
  },
  'AUSD': {
    // Uppercase alias for aUSD
    symbol: 'aUSD',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-susdt',
    decimals: 8,
    isNative: false,
  },
  'USDA': {
    // Alias for aUSD (legacy name from agent)
    symbol: 'aUSD',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK',
    contractName: 'token-susdt',
    decimals: 8,
    isNative: false,
  },
  'ALEX': {
    symbol: 'ALEX',
    contractAddress: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM',
    contractName: 'age000-governance-token',
    decimals: 8,
    isNative: false,
  },
};

/**
 * Swap Service for Stacks DEX
 * Directly calls smart contracts without requiring external APIs or SDKs
 */
class SwapService {
  /**
   * Get a swap quote from the DEX using ALEX API and contract read-only calls
   * Uses ALEX SDK API for routing and contract calls for quotes
   */
  static async getSwapQuote(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    slippageTolerance: number = 2.0, // 2% - increased to reduce failed swaps
    protocol: DEXProtocol = DEXProtocol.ALEX,
    networkId: string = 'mainnet'
  ): Promise<SwapQuote> {
    try {
      console.log(`[SwapService] Getting ALEX quote for ${inputAmount} ${inputToken} -> ${outputToken}`);

      const amount = parseFloat(inputAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid input amount: ${inputAmount}`);
      }

      let outputAmountFormatted: string;
      let route: string[];
      let priceImpact: number;
      let exchangeRateNum: number;

      try {
        // Try to get real quote from ALEX DEX contract
        console.log(`[SwapService] Attempting ALEX contract quote...`);
        const alexQuote = await getAlexQuote(inputToken, outputToken, amount);

        outputAmountFormatted = alexQuote.outputAmount;
        route = alexQuote.route;
        priceImpact = alexQuote.priceImpact;
        exchangeRateNum = alexQuote.exchangeRate;

        console.log(`[SwapService] Got ALEX quote: ${outputAmountFormatted} ${outputToken} (route: ${route.join(' → ')})`);
      } catch (alexError: any) {
        console.warn(`[SwapService] ALEX quote failed: ${alexError.message}`);
        console.log(`[SwapService] Falling back to price-based estimation...`);

        // Fallback: Estimate output based on USD prices
        const fromPriceData = await PriceService.getTokenPrice(inputToken);
        const toPriceData = await PriceService.getTokenPrice(outputToken);

        if (!fromPriceData || !toPriceData) {
          throw new Error(`Could not fetch price data for ${inputToken} or ${outputToken}`);
        }

        const inputValueUSD = amount * fromPriceData.price;
        const estimatedOutput = inputValueUSD / toPriceData.price;

        outputAmountFormatted = estimatedOutput.toFixed(8);
        route = [inputToken, outputToken];
        priceImpact = 0.5; // Estimate
        exchangeRateNum = estimatedOutput / amount;

        console.log(`[SwapService] Estimated ${inputAmount} ${inputToken} (~$${inputValueUSD.toFixed(2)}) = ${outputAmountFormatted} ${outputToken}`);
      }

      // Calculate minimum received with slippage
      const outputAmountNum = parseFloat(outputAmountFormatted);
      const slippageMultiplier = 1 - (slippageTolerance / 100);
      const minimumReceived = (outputAmountNum * slippageMultiplier).toFixed(8);

      const quote: SwapQuote = {
        inputAmount: inputAmount,
        outputAmount: outputAmountFormatted,
        inputToken,
        outputToken,
        priceImpact,
        minimumReceived,
        exchangeRate: exchangeRateNum.toFixed(8),
        protocol,
        route,
        // Legacy properties for backward compatibility
        amountOut: outputAmountFormatted,
        amountOutMin: minimumReceived,
        toToken: outputToken,
        gasEstimateUSD: '$0.01', // STX fees are very low
      };

      console.log(`[SwapService] Quote:`, quote);
      return quote;
    } catch (error: any) {
      console.error('[SwapService] Error getting quote:', error);
      throw error;
    }
  }

  /**
   * Execute a swap transaction using ALEX DEX v2 contract
   * Supports both direct swaps and multi-hop routes
   */
  static async executeSwap(
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    minimumOutputAmount: string,
    slippageTolerance: number = 2.0, // 2% - increased to reduce failed swaps
    protocol: DEXProtocol = DEXProtocol.ALEX,
    networkId: string = 'mainnet'
  ): Promise<SwapResult> {
    try {
      console.log(`[SwapService] Executing swap: ${inputAmount} ${inputToken} -> ${outputToken}`);

      // Get wallet info
      const senderAddress = await getWalletAddress();
      const privateKey = await getPrivateKey();

      if (!senderAddress) {
        throw new Error('No wallet address found');
      }

      if (!privateKey) {
        throw new Error('No private key found');
      }

      // Get token configs
      const inputTokenInfo = SWAP_TOKENS[inputToken.toUpperCase()];
      const outputTokenInfo = SWAP_TOKENS[outputToken.toUpperCase()];

      if (!inputTokenInfo || !outputTokenInfo) {
        throw new Error(`Unsupported token pair: ${inputToken}/${outputToken}`);
      }

      // Get DEX config
      const dexConfig = DEX_CONFIGS[protocol];

      // Convert amounts to base units (ALEX uses 8 decimals)
      const inputAmountBigInt = BigInt(Math.floor(parseFloat(inputAmount) * Math.pow(10, 8)));
      const minOutputBigInt = BigInt(Math.floor(parseFloat(minimumOutputAmount) * Math.pow(10, 8)));

      // Setup network
      const network = networkId === 'testnet' ? new StacksTestnet() : new StacksMainnet();

      // Find the route for this swap
      const routeInfo = await findRoute(inputToken, outputToken);
      const isMultiHop = routeInfo.isMultiHop;

      console.log(`[SwapService] Route: ${routeInfo.route.join(' -> ')} (${isMultiHop ? 'multi-hop' : 'direct'})`);

      // Build function arguments based on route type
      let functionName: string;
      let functionArgs: any[];

      if (isMultiHop && routeInfo.route.length === 3) {
        // 2-hop swap using swap-helper-a
        const midToken = routeInfo.route[1];
        const midTokenInfo = SWAP_TOKENS[midToken.toUpperCase()];

        if (!midTokenInfo) {
          throw new Error(`Intermediate token not found: ${midToken}`);
        }

        functionName = 'swap-helper-a';
        functionArgs = [
          contractPrincipalCV(inputTokenInfo.contractAddress, inputTokenInfo.contractName),
          contractPrincipalCV(midTokenInfo.contractAddress, midTokenInfo.contractName),
          contractPrincipalCV(outputTokenInfo.contractAddress, outputTokenInfo.contractName),
          uintCV(ALEX_POOL_FACTOR), // factor-x for pool 1
          uintCV(ALEX_POOL_FACTOR), // factor-y for pool 2
          uintCV(inputAmountBigInt.toString()), // dx
          someCV(uintCV(minOutputBigInt.toString())), // min-dz (optional)
        ];

        console.log(`[SwapService] Using 2-hop swap via ${midToken}`);
      } else {
        // Direct swap using swap-helper
        functionName = 'swap-helper';
        functionArgs = [
          contractPrincipalCV(inputTokenInfo.contractAddress, inputTokenInfo.contractName),
          contractPrincipalCV(outputTokenInfo.contractAddress, outputTokenInfo.contractName),
          uintCV(ALEX_POOL_FACTOR), // factor
          uintCV(inputAmountBigInt.toString()), // dx
          someCV(uintCV(minOutputBigInt.toString())), // min-dy (optional)
        ];

        console.log(`[SwapService] Using direct swap`);
      }

      // Post-conditions are set to Allow since ALEX contract handles transfers internally
      // For production, you may want to add more specific post-conditions

      console.log('[SwapService] Creating contract call transaction...');
      console.log(`  - Contract: ${dexConfig.contractAddress}.${dexConfig.contractName}`);
      console.log(`  - Function: ${functionName}`);
      console.log(`  - Input: ${inputAmount} ${inputToken}`);
      console.log(`  - Min Output: ${minimumOutputAmount} ${outputToken}`);

      // Create the contract call transaction
      const txOptions = {
        contractAddress: dexConfig.contractAddress,
        contractName: dexConfig.contractName,
        functionName,
        functionArgs,
        senderKey: privateKey,
        network,
        postConditionMode: PostConditionMode.Allow, // ALEX handles transfers internally
        anchorMode: AnchorMode.Any,
      };

      const transaction = await makeContractCall(txOptions);

      console.log('[SwapService] Broadcasting transaction...');
      const broadcastResponse = await broadcastTransaction(transaction, network);

      const txId = broadcastResponse.txid;
      const explorerUrl = `https://explorer.hiro.so/txid/${txId}?chain=${networkId}`;

      console.log(`[SwapService] Swap transaction broadcasted: ${txId}`);

      return {
        success: true,
        txId,
        explorerUrl,
        // Legacy properties for backward compatibility
        amountIn: inputAmount,
        fromToken: inputToken,
        amountOut: minimumOutputAmount,
        toToken: outputToken,
        transactionHash: txId,
        gasUsed: BigInt(0),
      };
    } catch (error: any) {
      console.error('[SwapService] Error executing swap:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during swap',
      };
    }
  }

  /**
   * Get supported token pairs for swapping
   */
  static getSupportedTokenPairs(): Array<{from: string; to: string}> {
    const tokens = Object.keys(SWAP_TOKENS);
    const pairs: Array<{from: string; to: string}> = [];

    for (const from of tokens) {
      for (const to of tokens) {
        if (from !== to) {
          pairs.push({ from, to });
        }
      }
    }

    return pairs;
  }

  /**
   * Check if a token pair is supported
   */
  static isTokenPairSupported(fromToken: string, toToken: string): boolean {
    return (
      SWAP_TOKENS[fromToken.toUpperCase()] !== undefined &&
      SWAP_TOKENS[toToken.toUpperCase()] !== undefined &&
      fromToken.toUpperCase() !== toToken.toUpperCase()
    );
  }

  /**
   * Get available DEX protocols
   */
  static getAvailableProtocols(): DEXProtocol[] {
    return Object.values(DEXProtocol);
  }

  /**
   * Get DEX protocol info
   */
  static getProtocolInfo(protocol: DEXProtocol): DEXConfig {
    return DEX_CONFIGS[protocol];
  }
}

export default SwapService;
