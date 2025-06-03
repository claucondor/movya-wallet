import { createPublicClient, createWalletClient, http, parseEther, formatEther, parseUnits, formatUnits, getContract, WalletClient, Account } from 'viem';
import { avalanche } from '@/constants/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../storage';

// Trader Joe Router V2.1 on Avalanche (most liquid DEX for WAVAX/USDC)
const TRADER_JOE_ROUTER_ADDRESS = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' as const;
const WAVAX_ADDRESS = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' as const;
const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as const;

// Trader Joe Router ABI (simplified for swaps)
const TRADER_JOE_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsIn',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 Token ABI (for approvals)
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  amountOutMin: string; // With slippage
  priceImpact: number;
  route: string[];
  gasEstimate: bigint;
  gasEstimateUSD: string;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  amountIn: string;
  amountOut?: string;
  fromToken: string;
  toToken: string;
  gasUsed?: bigint;
  error?: string;
}

class SwapService {
  private publicClient;
  private walletClient: WalletClient | null;
  private account: Account | null;
  private static instance: SwapService | null = null;

  private constructor() {
    this.publicClient = createPublicClient({
      chain: avalanche,
      transport: http()
    });

    // Initialize without wallet - will be set when needed
    this.walletClient = null;
    this.account = null;
  }

  public static getInstance(): SwapService {
    if (!SwapService.instance) {
      SwapService.instance = new SwapService();
    }
    return SwapService.instance;
  }

  private async initializeWallet() {
    try {
      const privateKey = storage.getString('userPrivateKey');
      if (!privateKey) {
        throw new Error('No private key found');
      }

      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: avalanche,
        transport: http()
      });

      console.log('[SwapService] Wallet initialized for address:', this.account.address);
    } catch (error) {
      console.error('[SwapService] Failed to initialize wallet:', error);
      throw error;
    }
  }

  /**
   * Get swap quote for WAVAX ↔ USDC
   */
  public async getSwapQuote(
    fromToken: 'WAVAX' | 'USDC', 
    toToken: 'WAVAX' | 'USDC', 
    amountIn: string,
    slippageTolerance: number = 0.5 // 0.5% default slippage
  ): Promise<SwapQuote> {
    try {
      console.log(`[SwapService] Getting quote: ${amountIn} ${fromToken} → ${toToken}`);

      // Validate token pair
      if (fromToken === toToken) {
        throw new Error('Cannot swap same token');
      }
      if (!((fromToken === 'WAVAX' && toToken === 'USDC') || (fromToken === 'USDC' && toToken === 'WAVAX'))) {
        throw new Error('Only WAVAX ↔ USDC swaps are supported');
      }

      const fromAddress = fromToken === 'WAVAX' ? WAVAX_ADDRESS : USDC_ADDRESS;
      const toAddress = toToken === 'WAVAX' ? WAVAX_ADDRESS : USDC_ADDRESS;
      const path = [fromAddress, toAddress];

      // Parse amount based on token decimals (WAVAX: 18, USDC: 6)
      const amountInWei = fromToken === 'WAVAX' 
        ? parseEther(amountIn)
        : parseUnits(amountIn, 6);

      // Get amounts out from Trader Joe
      const router = getContract({
        address: TRADER_JOE_ROUTER_ADDRESS,
        abi: TRADER_JOE_ROUTER_ABI,
        client: this.publicClient
      });

      const amounts = await router.read.getAmountsOut([amountInWei, path]);
      const amountOut = amounts[1];

      // Format amount out based on target token decimals
      const amountOutFormatted = toToken === 'WAVAX' 
        ? formatEther(amountOut)
        : formatUnits(amountOut, 6);

      // Calculate minimum amount out with slippage
      const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100));
      const amountOutMin = (amountOut * slippageMultiplier) / BigInt(10000);
      const amountOutMinFormatted = toToken === 'WAVAX' 
        ? formatEther(amountOutMin)
        : formatUnits(amountOutMin, 6);

      // Estimate gas
      const gasEstimate = BigInt(250000); // Conservative estimate for token swap
      const gasPrice = await this.publicClient.getGasPrice();
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostAVAX = formatEther(gasCostWei);
      const gasEstimateUSD = (parseFloat(gasCostAVAX) * 42.50).toFixed(2); // Approximate AVAX price

      // Calculate price impact (difference from expected 1:1 value ratio)
      const inputValue = fromToken === 'WAVAX' ? parseFloat(amountIn) * 42.50 : parseFloat(amountIn);
      const outputValue = toToken === 'WAVAX' ? parseFloat(amountOutFormatted) * 42.50 : parseFloat(amountOutFormatted);
      
      // Price impact should be the difference from the expected output value
      // If we swap $1 of token A, we should get ~$1 of token B (minus fees)
      // Price impact = (expected - actual) / expected * 100
      const expectedOutputValue = inputValue; // In a perfect world, $1 in = $1 out
      const priceImpact = Math.abs((expectedOutputValue - outputValue) / expectedOutputValue) * 100;
      
      // Cap at reasonable values (DEX swaps typically have 0.1-3% impact for normal amounts)
      const cappedPriceImpact = Math.min(priceImpact, 15); // Cap at 15% for display

      console.log(`[SwapService] Quote: ${amountIn} ${fromToken} → ${amountOutFormatted} ${toToken}`);

      return {
        fromToken,
        toToken,
        amountIn,
        amountOut: amountOutFormatted,
        amountOutMin: amountOutMinFormatted,
        priceImpact: cappedPriceImpact,
        route: [fromToken, toToken],
        gasEstimate,
        gasEstimateUSD: `$${gasEstimateUSD}`
      };
    } catch (error) {
      console.error('[SwapService] Error getting swap quote:', error);
      throw new Error(`Failed to get swap quote: ${(error as Error).message}`);
    }
  }

  /**
   * Execute WAVAX to USDC swap
   */
  public async swapWAVAXToUSDC(amountInWAVAX: string, slippageTolerance: number = 0.5): Promise<SwapResult> {
    await this.initializeWallet();
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`[SwapService] Swapping ${amountInWAVAX} WAVAX to USDC`);

      // Get quote first
      const quote = await this.getSwapQuote('WAVAX', 'USDC', amountInWAVAX, slippageTolerance);
      
      const amountInWei = parseEther(amountInWAVAX);
      const amountOutMinWei = parseUnits(quote.amountOutMin, 6);
      const path = [WAVAX_ADDRESS, USDC_ADDRESS];
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Check and approve WAVAX if needed
      await this.ensureTokenApproval(WAVAX_ADDRESS, amountInWei);

      // Execute swap
      const hash = await this.walletClient.writeContract({
        address: TRADER_JOE_ROUTER_ADDRESS,
        abi: TRADER_JOE_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountInWei, amountOutMinWei, path, this.account.address, deadline],
        chain: avalanche,
        account: this.account
      });

      console.log(`[SwapService] WAVAX→USDC swap transaction sent: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      console.log(`[SwapService] WAVAX→USDC swap confirmed! Gas used: ${receipt.gasUsed}`);

      return {
        success: true,
        transactionHash: hash,
        amountIn: amountInWAVAX,
        amountOut: quote.amountOut,
        fromToken: 'WAVAX',
        toToken: 'USDC',
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('[SwapService] Error swapping WAVAX to USDC:', error);
      return {
        success: false,
        amountIn: amountInWAVAX,
        fromToken: 'WAVAX',
        toToken: 'USDC',
        error: (error as Error).message
      };
    }
  }

  /**
   * Execute USDC to WAVAX swap
   */
  public async swapUSDCToWAVAX(amountInUSDC: string, slippageTolerance: number = 0.5): Promise<SwapResult> {
    await this.initializeWallet();
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    try {
      console.log(`[SwapService] Swapping ${amountInUSDC} USDC to WAVAX`);

      // Get quote first
      const quote = await this.getSwapQuote('USDC', 'WAVAX', amountInUSDC, slippageTolerance);
      
      const amountInWei = parseUnits(amountInUSDC, 6);
      const amountOutMinWei = parseEther(quote.amountOutMin);
      const path = [USDC_ADDRESS, WAVAX_ADDRESS];
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Check and approve USDC if needed
      await this.ensureTokenApproval(USDC_ADDRESS, amountInWei);

      // Execute swap
      const hash = await this.walletClient.writeContract({
        address: TRADER_JOE_ROUTER_ADDRESS,
        abi: TRADER_JOE_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountInWei, amountOutMinWei, path, this.account.address, deadline],
        chain: avalanche,
        account: this.account
      });

      console.log(`[SwapService] USDC→WAVAX swap transaction sent: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      console.log(`[SwapService] USDC→WAVAX swap confirmed! Gas used: ${receipt.gasUsed}`);

      return {
        success: true,
        transactionHash: hash,
        amountIn: amountInUSDC,
        amountOut: quote.amountOut,
        fromToken: 'USDC',
        toToken: 'WAVAX',
        gasUsed: receipt.gasUsed
      };
    } catch (error) {
      console.error('[SwapService] Error swapping USDC to WAVAX:', error);
      return {
        success: false,
        amountIn: amountInUSDC,
        fromToken: 'USDC',
        toToken: 'WAVAX',
        error: (error as Error).message
      };
    }
  }

  /**
   * Ensure token is approved for trading
   */
  private async ensureTokenApproval(tokenAddress: string, amount: bigint): Promise<void> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Check current allowance
      const token = getContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client: this.publicClient
      });

      const allowance = await token.read.allowance([
        this.account.address, 
        TRADER_JOE_ROUTER_ADDRESS
      ]);

      console.log(`[SwapService] Current allowance: ${allowance}, needed: ${amount}`);

      // If allowance is insufficient, approve
      if (allowance < amount) {
        console.log(`[SwapService] Approving token spend...`);
        
        const hash = await this.walletClient.writeContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TRADER_JOE_ROUTER_ADDRESS, amount],
          chain: avalanche,
          account: this.account
        });

        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`[SwapService] Token approval confirmed: ${hash}`);
      }
    } catch (error) {
      console.error('[SwapService] Error ensuring token approval:', error);
      throw error;
    }
  }

  /**
   * Get current wallet address
   */
  public getWalletAddress(): string | null {
    return this.account?.address || null;
  }
}

export default SwapService; 