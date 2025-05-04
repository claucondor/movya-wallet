import { avalanche, avalancheFuji } from '@/constants/chains';
import { createPublicClient, createWalletClient, formatEther, http, parseEther } from 'viem';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import { ActionResultInput } from '../types/agent';
import { reportActionResult } from './agentApi';
import { storage } from './storage';

const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

/**
 * Interface for the action handler parameters to support common configuration
 */
interface ActionHandlerParams {
  networkId?: 'mainnet' | 'testnet'; // Allow overriding which network to use
  privateKey?: string;               // Allow passing private key directly or retrieve from storage
  account?: PrivateKeyAccount;       // Allow passing account directly
}

/**
 * Gets the current chain configuration based on preferences
 */
function getChain(networkId: 'mainnet' | 'testnet' = 'testnet') {
  return networkId === 'mainnet' ? avalanche : avalancheFuji;
}

/**
 * Load or create wallet account from storage or provided key
 */
async function getAccount(params?: ActionHandlerParams): Promise<PrivateKeyAccount> {
  if (params?.account) {
    return params.account;
  }

  try {
    const privateKey = params?.privateKey || storage.getString(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKey) {
      throw new Error('No private key found in storage or provided.');
    }
    
    // Use non-dynamic import (was imported at the top of the file)
    return privateKeyToAccount(privateKey as `0x${string}`);
  } catch (error) {
    console.error('Failed to load account:', error);
    throw new Error('Could not load wallet account. Please check your wallet setup.');
  }
}

/**
 * Creates a public client for the specified network
 */
function createClient(networkId: 'mainnet' | 'testnet' = 'testnet') {
  const chain = getChain(networkId);
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });
}

/**
 * Main wallet action handler that processes all types of wallet actions
 */
export async function handleWalletAction(
  actionType: 'SEND_TRANSACTION' | 'FETCH_BALANCE' | 'FETCH_HISTORY',
  actionParams: {
    recipientAddress?: string | null;
    recipientEmail?: string | null;
    amount?: string | null;
    currency?: string | null;
  },
  handlerParams?: ActionHandlerParams
): Promise<{ 
  responseMessage: string;
}> {
  console.log(`[walletActionHandler] Handling ${actionType}:`, actionParams);
  
  try {
    let resultInput: ActionResultInput;
    
    switch(actionType) {
      case 'SEND_TRANSACTION':
        resultInput = await handleSendTransaction(actionParams, handlerParams);
        break;
      case 'FETCH_BALANCE':
        resultInput = await handleFetchBalance(handlerParams);
        break;
      case 'FETCH_HISTORY':
        resultInput = await handleFetchHistory(handlerParams);
        break;
      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }
    
    // Report result to the agent backend
    const response = await reportActionResult(resultInput);
    return response;
  } catch (error: any) {
    console.error(`[walletActionHandler] Error in ${actionType}:`, error);
    
    // Format error for reporting
    const resultInput: ActionResultInput = {
      actionType,
      status: 'failure',
      data: {
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message || `Unknown error during ${actionType}`
      }
    };
    
    try {
      // Try to report the error to get a user-friendly message
      const response = await reportActionResult(resultInput);
      return response;
    } catch (reportError) {
      console.error('[walletActionHandler] Error reporting failure:', reportError);
      // Fallback to generic error if reporting fails
      return {
        responseMessage: `There was a problem with your request: ${error.message || 'Unknown error'}`
      };
    }
  }
}

/**
 * Handles sending a transaction
 */
async function handleSendTransaction(
  actionParams: {
    recipientAddress?: string | null;
    recipientEmail?: string | null;
    amount?: string | null;
    currency?: string | null;
  },
  handlerParams?: ActionHandlerParams
): Promise<ActionResultInput> {
  console.log('[walletActionHandler] Send transaction requested:', actionParams);
  
  // Validate parameters
  const recipientAddress = actionParams.recipientAddress;
  if (!recipientAddress) {
    throw new Error('Recipient address is required for sending transactions');
  }
  
  const amount = actionParams.amount;
  if (!amount) {
    throw new Error('Amount is required for sending transactions');
  }
  
  // Validate currency - for now we only support AVAX
  const currency = actionParams.currency || 'AVAX';
  if (currency.toUpperCase() !== 'AVAX') {
    throw new Error(`Unsupported currency: ${currency}. Only AVAX is supported.`);
  }
  
  try {
    // Get account - must work with private key
    const account = await getAccount(handlerParams);
    const networkId = handlerParams?.networkId || 'testnet';
    const chain = getChain(networkId);
    
    // Create wallet client for sending transactions
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    });
    
    // Convert amount from human-readable to wei
    const amountWei = parseEther(amount);
    
    // Send transaction
    console.log(`[walletActionHandler] Sending ${amount} ${currency} to ${recipientAddress}`);
    const txHash = await walletClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountWei
    });
    
    console.log(`[walletActionHandler] Transaction sent successfully: ${txHash}`);
    
    // Format success result
    return {
      actionType: 'SEND_TRANSACTION',
      status: 'success',
      data: {
        transactionHash: txHash,
        amountSent: amount,
        currencySent: currency,
        recipient: recipientAddress
      }
    };
  } catch (error: any) {
    console.error('[walletActionHandler] Transaction error:', error);
    throw new Error(`Failed to send transaction: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handles fetching wallet balance
 */
async function handleFetchBalance(
  handlerParams?: ActionHandlerParams
): Promise<ActionResultInput> {
  console.log('[walletActionHandler] Fetch balance requested');
  
  try {
    // Get account
    const account = await getAccount(handlerParams);
    const networkId = handlerParams?.networkId || 'testnet';
    const chain = getChain(networkId);
    
    // Create client for balance check
    const client = createClient(networkId);
    
    // Fetch balance
    const balanceWei = await client.getBalance({
      address: account.address,
    });
    
    // Format the balance
    const balanceFormatted = formatEther(balanceWei);
    const balanceDisplay = parseFloat(balanceFormatted).toFixed(4);
    
    console.log(`[walletActionHandler] Balance: ${balanceDisplay} AVAX on ${chain.name}`);
    
    // Format success result
    return {
      actionType: 'FETCH_BALANCE',
      status: 'success',
      data: {
        balance: `${balanceDisplay} AVAX on ${chain.name}`
      }
    };
  } catch (error: any) {
    console.error('[walletActionHandler] Balance fetch error:', error);
    throw new Error(`Failed to fetch balance: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handles fetching transaction history
 * Note: For simplicity, this implementation returns simulated data
 * In a real implementation, you would query a blockchain explorer API
 */
async function handleFetchHistory(
  handlerParams?: ActionHandlerParams
): Promise<ActionResultInput> {
  console.log('[walletActionHandler] Fetch history requested');
  
  try {
    // Get account
    const account = await getAccount(handlerParams);
    const networkId = handlerParams?.networkId || 'testnet';
    const chain = getChain(networkId);
    
    // In a real implementation, you would:
    // 1. Call a blockchain explorer API (like SnowTrace for Avalanche)
    // 2. Filter and format the results
    // 3. Return a proper history array
    
    // For now, simulate a response with a few dummy transactions
    const simulatedHistory = [
      {
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        type: 'received' as 'received', // Use proper enum value with type assertion
        amount: '0.5 AVAX',
        recipientOrSender: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
      },
      {
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        type: 'sent' as 'sent', // Use proper enum value with type assertion
        amount: '0.2 AVAX',
        recipientOrSender: '0x8fD00f170FDf3772C5ebdCD90bF257316c69BA45'
      }
    ];
    
    console.log(`[walletActionHandler] Fetched ${simulatedHistory.length} transaction records from ${chain.name}`);
    
    // Format success result
    return {
      actionType: 'FETCH_HISTORY',
      status: 'success',
      data: {
        history: simulatedHistory
      }
    };
  } catch (error: any) {
    console.error('[walletActionHandler] History fetch error:', error);
    throw new Error(`Failed to fetch transaction history: ${error.message || 'Unknown error'}`);
  }
} 