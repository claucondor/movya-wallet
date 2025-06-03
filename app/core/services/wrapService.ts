import { createPublicClient, createWalletClient, http, parseEther, formatEther, getContract, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche } from '../../../constants/chains';
import { WAVAX_CONTRACT_ADDRESS } from '../../../constants/tokens';
import { storage } from '../storage';

// WAVAX Contract ABI (minimal for wrap/unwrap)
const WAVAX_ABI = [
  {
    "constant": false,
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "wad", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface WrapResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: bigint;
}

export interface WrapEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedFee: string; // in AVAX
}

class WrapService {
  private static instance: WrapService;
  private publicClient;
  private walletClient;
  private account;

  private constructor() {
    // Use fallback with multiple RPCs for better reliability
    const transport = fallback(
      avalanche.rpcUrls.default.http.map(url => http(url))
    );

    this.publicClient = createPublicClient({
      chain: avalanche,
      transport
    });

    // Initialize wallet client and account
    const privateKey = storage.getString('userPrivateKey');
    if (!privateKey) {
      throw new Error('No private key found');
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: avalanche,
      transport
    });
  }

  public static getInstance(): WrapService {
    if (!WrapService.instance) {
      WrapService.instance = new WrapService();
    }
    return WrapService.instance;
  }

  /**
   * Estimate gas for wrap operation
   */
  public async estimateWrapGas(amountInAvax: string): Promise<WrapEstimate> {
    try {
      const amountWei = parseEther(amountInAvax);
      
      // Check current balance first
      const balance = await this.publicClient.getBalance({
        address: this.account.address
      });

      // Check if user has enough balance (amount + estimated gas)
      const gasPrice = await this.publicClient.getGasPrice();
      const estimatedGasLimit = BigInt(21000); // Base estimate for simple contract call
      const estimatedGasCost = estimatedGasLimit * gasPrice;
      const totalNeeded = amountWei + estimatedGasCost;

      if (balance < totalNeeded) {
        throw new Error(`Insufficient balance. Need ${formatEther(totalNeeded)} AVAX, have ${formatEther(balance)} AVAX`);
      }

      // Now estimate actual gas
      const gasLimit = await this.publicClient.estimateContractGas({
        address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
        abi: WAVAX_ABI,
        functionName: 'deposit',
        value: amountWei,
        account: this.account.address
      });

      const estimatedFeeWei = gasLimit * gasPrice;
      const estimatedFee = formatEther(estimatedFeeWei);

      return {
        gasLimit,
        gasPrice,
        estimatedFee
      };
    } catch (error) {
      console.error('[WrapService] Error estimating wrap gas:', error);
      throw new Error('Failed to estimate transaction cost');
    }
  }

  /**
   * Estimate gas for unwrap operation
   */
  public async estimateUnwrapGas(amountInWavax: string): Promise<WrapEstimate> {
    try {
      const amountWei = parseEther(amountInWavax);
      
      const gasLimit = await this.publicClient.estimateContractGas({
        address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
        abi: WAVAX_ABI,
        functionName: 'withdraw',
        args: [amountWei],
        account: this.account.address
      });

      const gasPrice = await this.publicClient.getGasPrice();
      const estimatedFeeWei = gasLimit * gasPrice;
      const estimatedFee = formatEther(estimatedFeeWei);

      return {
        gasLimit,
        gasPrice,
        estimatedFee
      };
    } catch (error) {
      console.error('[WrapService] Error estimating unwrap gas:', error);
      throw new Error('Failed to estimate transaction cost');
    }
  }

  /**
   * Wrap AVAX to WAVAX
   */
  public async wrapAvax(amountInAvax: string): Promise<WrapResult> {
    try {
      console.log(`[WrapService] Wrapping ${amountInAvax} AVAX to WAVAX`);
      
      const amountWei = parseEther(amountInAvax);

      // Execute the wrap transaction
      const txHash = await this.walletClient.writeContract({
        address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
        abi: WAVAX_ABI,
        functionName: 'deposit',
        value: amountWei
      });

      console.log(`[WrapService] Wrap transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash
      });

      if (receipt.status === 'success') {
        console.log(`[WrapService] Wrap successful! Gas used: ${receipt.gasUsed}`);
        return {
          success: true,
          txHash,
          gasUsed: receipt.gasUsed
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }
    } catch (error: any) {
      console.error('[WrapService] Wrap failed:', error);
      return {
        success: false,
        error: error.message || 'Wrap operation failed'
      };
    }
  }

  /**
   * Unwrap WAVAX to AVAX
   */
  public async unwrapWavax(amountInWavax: string): Promise<WrapResult> {
    try {
      console.log(`[WrapService] Unwrapping ${amountInWavax} WAVAX to AVAX`);
      
      const amountWei = parseEther(amountInWavax);

      // Execute the unwrap transaction
      const txHash = await this.walletClient.writeContract({
        address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
        abi: WAVAX_ABI,
        functionName: 'withdraw',
        args: [amountWei]
      });

      console.log(`[WrapService] Unwrap transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash
      });

      if (receipt.status === 'success') {
        console.log(`[WrapService] Unwrap successful! Gas used: ${receipt.gasUsed}`);
        return {
          success: true,
          txHash,
          gasUsed: receipt.gasUsed
        };
      } else {
        return {
          success: false,
          error: 'Transaction failed'
        };
      }
    } catch (error: any) {
      console.error('[WrapService] Unwrap failed:', error);
      return {
        success: false,
        error: error.message || 'Unwrap operation failed'
      };
    }
  }

  /**
   * Get WAVAX balance for the current user
   */
  public async getWavaxBalance(): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
        abi: WAVAX_ABI,
        functionName: 'balanceOf',
        args: [this.account.address]
      });

      return formatEther(balance as bigint);
    } catch (error) {
      console.error('[WrapService] Error getting WAVAX balance:', error);
      return '0';
    }
  }
}

export default WrapService; 