import { storage } from '../storage';
import BalanceService from './balanceService';

// Transaction history types
export interface Transaction {
  id: string;
  hash?: string;
  type: 'sent' | 'received' | 'pending';
  amount: string;
  currency: 'AVAX' | 'USDC';
  usdValue?: string;
  recipient?: string;
  recipientNickname?: string;
  sender?: string;
  senderNickname?: string;
  timestamp: number;
  confirmed: boolean;
  explorerUrl?: string;
  // For incoming detection
  detectedIncoming?: boolean;
}

export interface TransactionHistory {
  transactions: Transaction[];
  lastBalanceCheck: {
    avax: string;
    usdc: string;
    timestamp: number;
  };
}

const HISTORY_STORAGE_KEY = 'transactionHistory';
const MAX_TRANSACTIONS = 500; // Keep last 500 transactions
const BALANCE_CHECK_INTERVAL = 30000; // 30 seconds
const INCOMING_DETECTION_THRESHOLD = 0.001; // Minimum amount to consider as incoming

class TransactionHistoryService {
  private static instance: TransactionHistoryService;
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;

  private constructor() {}

  static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  /**
   * Get complete transaction history
   */
  getHistory(): TransactionHistory {
    try {
      const historyData = storage.getString(HISTORY_STORAGE_KEY);
      if (historyData) {
        const parsed = JSON.parse(historyData);
        return {
          transactions: parsed.transactions || [],
          lastBalanceCheck: parsed.lastBalanceCheck || {
            avax: '0',
            usdc: '0',
            timestamp: 0
          }
        };
      }
    } catch (error) {
      console.error('[TransactionHistory] Error reading history:', error);
    }

    return {
      transactions: [],
      lastBalanceCheck: {
        avax: '0',
        usdc: '0',
        timestamp: 0
      }
    };
  }

  /**
   * Save transaction history
   */
  private saveHistory(history: TransactionHistory): void {
    try {
      // Limit number of transactions
      if (history.transactions.length > MAX_TRANSACTIONS) {
        history.transactions = history.transactions
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_TRANSACTIONS);
      }

      storage.set(HISTORY_STORAGE_KEY, JSON.stringify(history));
      console.log(`[TransactionHistory] Saved ${history.transactions.length} transactions`);
    } catch (error) {
      console.error('[TransactionHistory] Error saving history:', error);
    }
  }

  /**
   * Add outgoing transaction (when user sends)
   */
  addOutgoingTransaction(
    hash: string,
    amount: string,
    currency: 'AVAX' | 'USDC',
    recipient: string,
    recipientNickname?: string,
    usdValue?: string
  ): void {
    const history = this.getHistory();
    
    const transaction: Transaction = {
      id: `out_${hash}`,
      hash,
      type: 'sent',
      amount,
      currency,
      usdValue,
      recipient,
      recipientNickname,
      timestamp: Date.now(),
      confirmed: false, // Will be confirmed later when we detect it on-chain
      explorerUrl: `https://snowtrace.io/tx/${hash}`
    };

    history.transactions.unshift(transaction); // Add to beginning
    this.saveHistory(history);

    console.log(`[TransactionHistory] Added outgoing transaction: ${amount} ${currency} to ${recipientNickname || recipient}`);
  }

  /**
   * Add incoming transaction (auto-detected)
   */
  private addIncomingTransaction(
    amount: string,
    currency: 'AVAX' | 'USDC',
    estimatedUsdValue?: string
  ): void {
    const history = this.getHistory();
    
    const transaction: Transaction = {
      id: `in_${Date.now()}_${currency}`,
      type: 'received',
      amount,
      currency,
      usdValue: estimatedUsdValue,
      timestamp: Date.now(),
      confirmed: true,
      detectedIncoming: true,
      sender: 'Unknown' // We can't know sender from balance check alone
    };

    history.transactions.unshift(transaction);
    this.saveHistory(history);

    console.log(`[TransactionHistory] 🎉 Detected incoming transaction: +${amount} ${currency}`);
  }

  /**
   * Mark transaction as confirmed (when we see it on-chain)
   */
  confirmTransaction(hash: string): void {
    const history = this.getHistory();
    const transaction = history.transactions.find(tx => tx.hash === hash);
    
    if (transaction) {
      transaction.confirmed = true;
      this.saveHistory(history);
      console.log(`[TransactionHistory] ✅ Confirmed transaction: ${hash}`);
    }
  }

  /**
   * Get recent transactions (for UI display)
   */
  getRecentTransactions(limit = 20): Transaction[] {
    const history = this.getHistory();
    return history.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: 'sent' | 'received'): Transaction[] {
    const history = this.getHistory();
    return history.transactions
      .filter(tx => tx.type === type)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Start automatic balance polling to detect incoming transactions
   */
  startIncomingDetection(): void {
    if (this.isPolling) {
      console.log('[TransactionHistory] Already polling for incoming transactions');
      return;
    }

    console.log('[TransactionHistory] 🔄 Starting incoming transaction detection...');
    this.isPolling = true;

    this.intervalId = setInterval(async () => {
      await this.checkForIncomingTransactions();
    }, BALANCE_CHECK_INTERVAL);

    // Initial check
    this.checkForIncomingTransactions();
  }

  /**
   * Stop automatic polling
   */
  stopIncomingDetection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    console.log('[TransactionHistory] ⏹️ Stopped incoming transaction detection');
  }

  /**
   * Check for incoming transactions by comparing balances
   */
  private async checkForIncomingTransactions(): Promise<void> {
    try {
      const history = this.getHistory();
      const lastCheck = history.lastBalanceCheck;

      // Get current balances
      const currentBalances = await BalanceService.getAllBalances(43114); // Avalanche mainnet
      
      // Extract AVAX and USDC balances from the array
      const avaxBalance = currentBalances.find(token => token.symbol === 'AVAX');
      const usdcBalance = currentBalances.find(token => token.symbol === 'USDC');
      
      const currentAvax = parseFloat(avaxBalance?.balance || '0');
      const currentUsdc = parseFloat(usdcBalance?.balance || '0');
      const lastAvax = parseFloat(lastCheck.avax || '0');
      const lastUsdc = parseFloat(lastCheck.usdc || '0');

      // Detect AVAX incoming
      if (currentAvax > lastAvax + INCOMING_DETECTION_THRESHOLD) {
        const incomingAmount = (currentAvax - lastAvax).toFixed(4);
        const estimatedUsd = await this.estimateUsdValue(incomingAmount, 'AVAX');
        this.addIncomingTransaction(incomingAmount, 'AVAX', estimatedUsd);
      }

      // Detect USDC incoming
      if (currentUsdc > lastUsdc + INCOMING_DETECTION_THRESHOLD) {
        const incomingAmount = (currentUsdc - lastUsdc).toFixed(2);
        const estimatedUsd = await this.estimateUsdValue(incomingAmount, 'USDC');
        this.addIncomingTransaction(incomingAmount, 'USDC', estimatedUsd);
      }

      // Update last balance check
      history.lastBalanceCheck = {
        avax: avaxBalance?.balance || '0',
        usdc: usdcBalance?.balance || '0',
        timestamp: Date.now()
      };

      this.saveHistory(history);

    } catch (error) {
      console.error('[TransactionHistory] Error checking for incoming transactions:', error);
    }
  }

  /**
   * Estimate USD value (simple mock - could integrate with price service)
   */
  private async estimateUsdValue(amount: string, currency: 'AVAX' | 'USDC'): Promise<string> {
    try {
      const numAmount = parseFloat(amount);
      if (currency === 'USDC') {
        return `$${numAmount.toFixed(2)}`;
      }
      // Mock AVAX price - in real app, fetch from price service
      const avaxPrice = 42.50;
      return `$${(numAmount * avaxPrice).toFixed(2)}`;
    } catch {
      return '$0.00';
    }
  }

  /**
   * Clear all history (for testing/reset)
   */
  clearHistory(): void {
    storage.delete(HISTORY_STORAGE_KEY);
    console.log('[TransactionHistory] 🗑️ Cleared transaction history');
  }

  /**
   * Get transaction statistics
   */
  getStats(): {
    total: number;
    sent: number;
    received: number;
    totalSentUsd: number;
    totalReceivedUsd: number;
  } {
    const history = this.getHistory();
    const sent = history.transactions.filter(tx => tx.type === 'sent');
    const received = history.transactions.filter(tx => tx.type === 'received');

    const totalSentUsd = sent.reduce((sum, tx) => {
      const usd = parseFloat(tx.usdValue?.replace('$', '') || '0');
      return sum + usd;
    }, 0);

    const totalReceivedUsd = received.reduce((sum, tx) => {
      const usd = parseFloat(tx.usdValue?.replace('$', '') || '0');
      return sum + usd;
    }, 0);

    return {
      total: history.transactions.length,
      sent: sent.length,
      received: received.length,
      totalSentUsd,
      totalReceivedUsd
    };
  }
}

export default TransactionHistoryService; 