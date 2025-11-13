import { DEFAULT_NETWORK, getHiroApiKey } from '../constants/networks';
import { getWalletAddress } from '../../internal/walletService';

// Transaction types for Stacks
export interface Transaction {
  txid: string;
  type: 'sent' | 'received' | 'contract_call' | 'token_transfer';
  status: 'success' | 'pending' | 'failed';
  amount: string;
  currency: 'STX' | 'sBTC' | 'USDA' | string;
  recipient?: string;
  sender?: string;
  timestamp: number;
  blockHeight?: number;
  fee?: string;
  explorerUrl: string;
}

/**
 * Transaction History Service for Stacks
 * Fetches transaction history from Hiro API on-demand
 */
class TransactionHistoryService {
  private static instance: TransactionHistoryService;

  private constructor() {}

  static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  /**
   * Fetch transaction history from Hiro API
   * @param limit Number of transactions to fetch (default 50)
   */
  async fetchTransactionHistory(limit: number = 50): Promise<Transaction[]> {
    try {
      const address = await getWalletAddress();
      if (!address) {
        console.error('[TransactionHistory] No wallet address found');
        return [];
      }

      const network = DEFAULT_NETWORK;
      const apiKey = getHiroApiKey();

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const url = `${network.url}/extended/v1/address/${address}/transactions?limit=${limit}`;
      console.log(`[TransactionHistory] Fetching history from: ${url}`);

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();
      const transactions: Transaction[] = [];

      // Parse transactions from Hiro API response
      for (const tx of data.results || []) {
        const parsedTx = this.parseTransaction(tx, address);
        if (parsedTx) {
          transactions.push(parsedTx);
        }
      }

      console.log(`[TransactionHistory] Fetched ${transactions.length} transactions`);
      return transactions;

    } catch (error) {
      console.error('[TransactionHistory] Error fetching history:', error);
      return [];
    }
  }

  /**
   * Parse a transaction from Hiro API format
   */
  private parseTransaction(tx: any, myAddress: string): Transaction | null {
    try {
      const txid = tx.tx_id;
      const status = tx.tx_status === 'success' ? 'success' :
                     tx.tx_status === 'pending' ? 'pending' : 'failed';

      // Determine transaction type
      let type: 'sent' | 'received' | 'contract_call' | 'token_transfer' = 'contract_call';
      let amount = '0';
      let currency = 'STX';
      let recipient = '';
      let sender = tx.sender_address || '';

      if (tx.tx_type === 'token_transfer') {
        // STX transfer
        type = sender === myAddress ? 'sent' : 'received';
        amount = (parseInt(tx.token_transfer?.amount || '0') / 1_000_000).toString();
        currency = 'STX';
        recipient = tx.token_transfer?.recipient_address || '';
      } else if (tx.tx_type === 'contract_call') {
        // SIP-010 token transfer or other contract call
        type = 'contract_call';
        // Try to parse if it's a token transfer
        if (tx.contract_call?.function_name === 'transfer') {
          type = sender === myAddress ? 'sent' : 'received';
          currency = 'Token'; // Would need to parse contract to get symbol
        }
      }

      const explorerUrl = `${DEFAULT_NETWORK.explorerUrls[0]}/txid/${txid}`;

      return {
        txid,
        type,
        status,
        amount,
        currency,
        recipient,
        sender,
        timestamp: tx.burn_block_time || Date.now() / 1000,
        blockHeight: tx.block_height,
        fee: tx.fee_rate ? (parseInt(tx.fee_rate) / 1_000_000).toString() : undefined,
        explorerUrl
      };

    } catch (error) {
      console.error('[TransactionHistory] Error parsing transaction:', error);
      return null;
    }
  }

  /**
   * Get recent transactions (calls fetchTransactionHistory)
   */
  async getRecentTransactions(limit: number = 20): Promise<Transaction[]> {
    return this.fetchTransactionHistory(limit);
  }

  /**
   * Add outgoing transaction (for local tracking before confirmation)
   * This is optional - mainly for UX to show pending tx immediately
   */
  addOutgoingTransaction(
    txid: string,
    amount: string,
    currency: string,
    recipient: string,
    recipientNickname?: string,
    usdValue?: string
  ): void {
    console.log(`[TransactionHistory] Tracking outgoing tx: ${txid}`);
    // In a real implementation, you might store this locally
    // For now, we just rely on Hiro API fetching
  }
}

export default TransactionHistoryService;
