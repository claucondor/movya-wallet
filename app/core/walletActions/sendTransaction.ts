import {
  makeSTXTokenTransfer,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  makeStandardFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
  TransactionVersion,
} from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { ActionResultInput } from '../../types/agent';
import { WalletActionResult } from '../walletActionHandler';
import { getPrivateKey, getWalletAddress } from '../../internal/walletService';
import { findToken, parseTokenAmount, parseContractPrincipal } from '../constants/tokens';
import { DEFAULT_NETWORK, getHiroApiKey } from '../constants/networks';
import { principalCV, uintCV, noneCV, someCV, bufferCV } from '@stacks/transactions';

/**
 * Send STX or SIP-010 tokens on Stacks blockchain
 */
export async function sendTransaction(
  recipientAddress: string,
  amount: string,
  currency: 'STX' | 'sBTC' | 'USDA' = 'STX'
): Promise<WalletActionResult> {
  console.log(`[sendTransaction] Starting send of ${amount} ${currency} to ${recipientAddress}`);

  try {
    // Basic validations
    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    if (!recipientAddress.startsWith('SP') && !recipientAddress.startsWith('ST')) {
      throw new Error('Invalid Stacks address. Must start with SP (mainnet) or ST (testnet)');
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Get sender's private key and address
    const privateKey = await getPrivateKey();
    if (!privateKey) {
      throw new Error('Private key not found. Please log in again.');
    }

    const senderAddress = await getWalletAddress();
    if (!senderAddress) {
      throw new Error('Wallet address not found. Please log in again.');
    }

    console.log(`[sendTransaction] Preparing transaction from ${senderAddress}`);

    // Get token info
    const token = findToken(currency, 'mainnet');
    if (!token) {
      throw new Error(`Token ${currency} not supported`);
    }

    // Parse amount to base units
    const amountInBaseUnits = parseTokenAmount(amount, token);

    // Setup network
    const network = DEFAULT_NETWORK.isTestnet ? new StacksTestnet() : new StacksMainnet();

    let txid: string;

    if (currency === 'STX') {
      // Send native STX
      console.log(`[sendTransaction] Sending ${amount} STX to ${recipientAddress}`);

      const txOptions = {
        recipient: recipientAddress,
        amount: amountInBaseUnits,
        senderKey: privateKey,
        network,
        memo: '', // Optional memo
        anchorMode: AnchorMode.Any,
        // Post condition: sender will send exactly this amount of STX
        postConditions: [
          makeStandardSTXPostCondition(
            senderAddress,
            FungibleConditionCode.Equal,
            amountInBaseUnits
          )
        ],
        postConditionMode: PostConditionMode.Deny, // Reject if post conditions fail
      };

      const transaction = await makeSTXTokenTransfer(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, network);

      if (broadcastResponse.error) {
        throw new Error(`Transaction failed: ${broadcastResponse.error}`);
      }

      if ('txid' in broadcastResponse) {
        txid = broadcastResponse.txid;
      } else {
        throw new Error('Transaction broadcast failed: no txid returned');
      }

    } else {
      // Send SIP-010 token (sBTC, USDA, etc.)
      if (!token.contractAddress) {
        throw new Error(`Token ${currency} has no contract address`);
      }

      console.log(`[sendTransaction] Sending ${amount} ${currency} to ${recipientAddress}`);

      const { address: contractAddr, contractName } = parseContractPrincipal(token.contractAddress);

      // Post condition: sender will send exactly this amount of tokens
      const postConditions = [
        makeStandardFungiblePostCondition(
          senderAddress,
          FungibleConditionCode.Equal,
          amountInBaseUnits,
          createAssetInfo(contractAddr, contractName, token.assetName || token.symbol.toLowerCase())
        )
      ];

      const txOptions = {
        contractAddress: contractAddr,
        contractName: contractName,
        functionName: 'transfer',
        functionArgs: [
          uintCV(amountInBaseUnits.toString()),
          principalCV(senderAddress),
          principalCV(recipientAddress),
          noneCV() // Optional memo
        ],
        senderKey: privateKey,
        network,
        postConditions,
        postConditionMode: PostConditionMode.Deny,
        anchorMode: AnchorMode.Any,
      };

      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, network);

      if (broadcastResponse.error) {
        throw new Error(`Transaction failed: ${broadcastResponse.error}`);
      }

      if ('txid' in broadcastResponse) {
        txid = broadcastResponse.txid;
      } else {
        throw new Error('Transaction broadcast failed: no txid returned');
      }
    }

    console.log(`[sendTransaction] Transaction sent successfully. Txid: ${txid}`);

    // Prepare data to report to agent
    const actionResult: ActionResultInput = {
      actionType: 'SEND_TRANSACTION',
      status: 'success',
      data: {
        transactionHash: txid,
        amountSent: amount,
        currencySent: currency,
        recipient: recipientAddress,
      }
    };

    return {
      success: true,
      responseMessage: `Transaction completed. Sent ${amount} ${currency} to ${recipientAddress}. Txid: ${txid}`,
      data: actionResult
    };

  } catch (error: any) {
    console.error('[sendTransaction] Error sending transaction:', error);

    // Format error response
    const actionResult: ActionResultInput = {
      actionType: 'SEND_TRANSACTION',
      status: 'failure',
      data: {
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message || 'Unknown error sending transaction'
      }
    };

    return {
      success: false,
      responseMessage: `Error sending transaction: ${error.message || 'Unknown error'}`,
      data: actionResult
    };
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function SendTransactionExport() {
  return null;
}
