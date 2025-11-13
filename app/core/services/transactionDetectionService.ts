import { DEFAULT_NETWORK, getHiroApiKey } from '../constants/networks';
import { getWalletAddress } from '../../internal/walletService';

/**
 * Transaction Detection Service for Stacks
 * Simple polling-based detection (no WebSocket to avoid Expo complications)
 */
class TransactionDetectionService {
  private static instance: TransactionDetectionService;
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheckedBlockHeight: number = 0;
  private onTransactionCallback: ((tx: any) => void) | null = null;

  private constructor() {}

  static getInstance(): TransactionDetectionService {
    if (!TransactionDetectionService.instance) {
      TransactionDetectionService.instance = new TransactionDetectionService();
    }
    return TransactionDetectionService.instance;
  }

  /**
   * Start monitoring for incoming transactions
   * @param callback Function to call when new transaction detected
   * @param pollInterval Milliseconds between checks (default 30000 = 30s)
   */
  startMonitoring(callback: (tx: any) => void, pollInterval: number = 30000): void {
    if (this.intervalId) {
      console.log('[TransactionDetection] Already monitoring');
      return;
    }

    this.onTransactionCallback = callback;

    console.log(`[TransactionDetection] Starting monitoring (poll every ${pollInterval}ms)`);

    // Initial check
    this.checkForNewTransactions();

    // Set up polling
    this.intervalId = setInterval(() => {
      this.checkForNewTransactions();
    }, pollInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TransactionDetection] Stopped monitoring');
    }
  }

  /**
   * Check for new transactions
   */
  private async checkForNewTransactions(): Promise<void> {
    try {
      const address = await getWalletAddress();
      if (!address) {
        return;
      }

      const network = DEFAULT_NETWORK;
      const apiKey = getHiroApiKey();

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      // Fetch latest transactions
      const url = `${network.url}/extended/v1/address/${address}/transactions?limit=10`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.error('[TransactionDetection] Failed to fetch:', response.statusText);
        return;
      }

      const data = await response.json();

      // Check for new transactions
      for (const tx of data.results || []) {
        const blockHeight = tx.block_height || 0;

        // If this transaction is newer than last checked
        if (blockHeight > this.lastCheckedBlockHeight) {
          // Check if it's incoming (not sent by us)
          if (tx.sender_address !== address && tx.tx_status === 'success') {
            console.log('[TransactionDetection] New incoming transaction:', tx.tx_id);

            // Call callback
            if (this.onTransactionCallback) {
              this.onTransactionCallback(tx);
            }
          }

          // Update last checked block height
          if (blockHeight > this.lastCheckedBlockHeight) {
            this.lastCheckedBlockHeight = blockHeight;
          }
        }
      }

    } catch (error) {
      console.error('[TransactionDetection] Error checking transactions:', error);
    }
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.intervalId !== null;
  }
}

export default TransactionDetectionService;
