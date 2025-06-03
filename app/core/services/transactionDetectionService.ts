import { createPublicClient, http, getAddress, Log, decodeEventLog } from 'viem';
import { avalanche } from '@/constants/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../storage';
import { getContacts, Contact } from '../../internal/contactService';
import TransactionHistoryService, { Transaction } from './transactionHistoryService';
import { WAVAX_CONTRACT_ADDRESS } from '@/constants/tokens';

// WAVAX Contract Events ABI
const WAVAX_EVENTS_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'dst', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' }
    ],
    name: 'Deposit',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'src', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' }
    ],
    name: 'Withdrawal',
    type: 'event'
  }
] as const;

export interface DetectedTransaction {
    hash: string;
    from: string;
    to: string;
    value: bigint;
    blockNumber: number;
    timestamp: number;
    senderNickname?: string;
    recipientNickname?: string;
    isFromApp?: boolean;
    senderAppUserId?: string;
    transactionType?: 'wrap' | 'unwrap';
}

class TransactionDetectionService {
    private static instance: TransactionDetectionService;
    private publicClient;
    private lastCheckedBlock: number = 0;
    private contacts: Contact[] = [];
    private userAddress: string | null = null;

    private constructor() {
        this.publicClient = createPublicClient({
            chain: avalanche,
            transport: http(avalanche.rpcUrls.default.http[0])
        });
    }

    public static getInstance(): TransactionDetectionService {
        if (!TransactionDetectionService.instance) {
            TransactionDetectionService.instance = new TransactionDetectionService();
        }
        return TransactionDetectionService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            // Get user's wallet address
            const privateKey = storage.getString('userPrivateKey');
            if (privateKey) {
                const account = privateKeyToAccount(privateKey as `0x${string}`);
                this.userAddress = account.address;
            }

            // Load contacts
            await this.loadContacts();

            // Get latest block number
            const latestBlock = await this.publicClient.getBlockNumber();
            this.lastCheckedBlock = Number(latestBlock) - 10; // Start checking from 10 blocks ago

            console.log('[TransactionDetection] Initialized with address:', this.userAddress);
            console.log('[TransactionDetection] Starting from block:', this.lastCheckedBlock);
        } catch (error) {
            console.error('[TransactionDetection] Initialization error:', error);
        }
    }

    private async loadContacts(): Promise<void> {
        try {
            const userId = storage.getString('userId');
            if (userId) {
                const result = await getContacts(userId);
                if (result.success) {
                    this.contacts = result.contacts;
                    console.log(`[TransactionDetection] Loaded ${this.contacts.length} contacts`);
                }
            }
        } catch (error) {
            console.error('[TransactionDetection] Error loading contacts:', error);
            this.contacts = [];
        }
    }

    public async checkForNewTransactions(): Promise<DetectedTransaction[]> {
        if (!this.userAddress) {
            console.log('[TransactionDetection] No user address available');
            return [];
        }

        try {
            const latestBlock = await this.publicClient.getBlockNumber();
            const currentBlock = Number(latestBlock);

            if (this.lastCheckedBlock >= currentBlock) {
                return []; // No new blocks to check
            }

            console.log(`[TransactionDetection] Checking blocks ${this.lastCheckedBlock + 1} to ${currentBlock}`);

            const detectedTransactions: DetectedTransaction[] = [];

            // Check for AVAX transfers and WAVAX wrap/unwrap events
            await Promise.all([
                this.checkAvaxTransfers(this.lastCheckedBlock + 1, currentBlock, detectedTransactions),
                this.checkWavaxEvents(this.lastCheckedBlock + 1, currentBlock, detectedTransactions)
            ]);

            this.lastCheckedBlock = currentBlock;
            return detectedTransactions;

        } catch (error) {
            console.error('[TransactionDetection] Error checking for transactions:', error);
            return [];
        }
    }

    private async checkAvaxTransfers(fromBlock: number, toBlock: number, detectedTransactions: DetectedTransaction[]): Promise<void> {
        try {
            // Check recent blocks for AVAX transactions involving our address
            for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
                const block = await this.publicClient.getBlock({
                    blockNumber: BigInt(blockNum),
                    includeTransactions: true
                });

                for (const tx of block.transactions) {
                    if (typeof tx === 'object' && tx.to) {
                        // Check if this transaction is TO our address (received)
                        if (tx.to.toLowerCase() === this.userAddress.toLowerCase() && tx.value > 0n) {
                            const detectedTx = await this.processTransaction(tx, Number(blockNum), Number(block.timestamp));
                            if (detectedTx) {
                                detectedTransactions.push(detectedTx);
                                
                                // Add to transaction history
                                await this.addToTransactionHistory(detectedTx);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[TransactionDetection] Error checking AVAX transfers:', error);
        }
    }

    private async checkWavaxEvents(fromBlock: number, toBlock: number, detectedTransactions: DetectedTransaction[]): Promise<void> {
        try {
            // Get WAVAX contract logs for Deposit and Withdrawal events
            const logs = await this.publicClient.getLogs({
                address: WAVAX_CONTRACT_ADDRESS as `0x${string}`,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                events: WAVAX_EVENTS_ABI
            });

            for (const log of logs) {
                await this.processWavaxEvent(log, detectedTransactions);
            }
        } catch (error) {
            console.error('[TransactionDetection] Error checking WAVAX events:', error);
        }
    }

    private async processWavaxEvent(log: Log, detectedTransactions: DetectedTransaction[]): Promise<void> {
        try {
            // Check if required fields are present
            if (!log.blockNumber || !log.transactionHash) {
                console.warn('[TransactionDetection] Missing blockNumber or transactionHash in log');
                return;
            }

            const decoded = decodeEventLog({
                abi: WAVAX_EVENTS_ABI,
                data: log.data,
                topics: log.topics
            });

            let userAddress: string;
            let transactionType: 'wrap' | 'unwrap';
            
            if (decoded.eventName === 'Deposit') {
                userAddress = decoded.args.dst as string;
                transactionType = 'wrap';
            } else if (decoded.eventName === 'Withdrawal') {
                userAddress = decoded.args.src as string;
                transactionType = 'unwrap';
            } else {
                return; // Unknown event
            }

            // Only process if it involves our user
            if (userAddress.toLowerCase() !== this.userAddress?.toLowerCase()) {
                return;
            }

            const amount = decoded.args.wad as bigint;
            
            // Get block details
            const block = await this.publicClient.getBlock({
                blockNumber: log.blockNumber
            });

            // Get transaction details
            const tx = await this.publicClient.getTransaction({
                hash: log.transactionHash
            });

            // Create detected transaction for wrap/unwrap
            const detectedTransaction: DetectedTransaction = {
                hash: log.transactionHash,
                from: transactionType === 'wrap' ? userAddress : userAddress, // Self transaction
                to: transactionType === 'wrap' ? userAddress : userAddress,   // Self transaction
                value: amount,
                blockNumber: Number(log.blockNumber),
                timestamp: Number(block.timestamp),
                senderNickname: 'You', // Self transaction
                recipientNickname: 'You',
                isFromApp: true,
                transactionType // Add this field to identify wrap/unwrap
            };

            console.log(`[TransactionDetection] Detected ${transactionType} transaction:`, {
                hash: log.transactionHash,
                amount: (Number(amount) / 1e18).toFixed(4),
                type: transactionType
            });

            detectedTransactions.push(detectedTransaction);
            
            // Add to transaction history with proper type
            await this.addWrapUnwrapToHistory(detectedTransaction, transactionType);

        } catch (error) {
            console.error('[TransactionDetection] Error processing WAVAX event:', error);
        }
    }

    private async addWrapUnwrapToHistory(detectedTx: DetectedTransaction, transactionType: 'wrap' | 'unwrap'): Promise<void> {
        try {
            const historyService = TransactionHistoryService.getInstance();
            
            // For wrap/unwrap, we'll add them as "sent" transactions with special currency notation
            const displayCurrency = transactionType === 'wrap' ? 'AVAX' : 'AVAX'; // Base currency for amount
            const displayType: 'sent' | 'received' = 'sent'; // Treat as self-transactions
            
            const transaction: Transaction = {
                id: detectedTx.hash,
                hash: detectedTx.hash,
                type: displayType,
                amount: (Number(detectedTx.value) / 1e18).toFixed(4),
                currency: displayCurrency,
                timestamp: detectedTx.timestamp * 1000,
                recipient: detectedTx.to,
                recipientNickname: transactionType === 'wrap' ? 'Wrapped to WAVAX' : 'Unwrapped to AVAX',
                sender: detectedTx.from,
                senderNickname: 'You',
                confirmed: true,
                explorerUrl: `https://snowtrace.io/tx/${detectedTx.hash}`
            };

            // Add using the outgoing transaction method
            historyService.addOutgoingTransaction(
                detectedTx.hash,
                transaction.amount,
                displayCurrency,
                detectedTx.to,
                transaction.recipientNickname
            );

            console.log(`[TransactionDetection] Added ${transactionType} transaction to history:`, detectedTx.hash);

        } catch (error) {
            console.error('[TransactionDetection] Error adding wrap/unwrap to history:', error);
        }
    }

    private async processTransaction(tx: any, blockNumber: number, timestamp: number): Promise<DetectedTransaction | null> {
        try {
            const from = getAddress(tx.from);
            const to = getAddress(tx.to);
            
            // Find sender in contacts
            const senderContact = this.contacts.find(contact => 
                contact.type === 'address' && 
                contact.value.toLowerCase() === from.toLowerCase()
            );

            // Check if sender is from the app and get their info
            const { isFromApp, appUserInfo } = await this.checkIfFromAppWithInfo(from);
            
            // Use contact nickname, then app user nickname, or fallback to address
            let senderNickname = senderContact?.nickname;
            if (!senderNickname && appUserInfo?.nickname) {
                senderNickname = appUserInfo.nickname;
            }

            const detectedTransaction: DetectedTransaction = {
                hash: tx.hash,
                from,
                to,
                value: tx.value,
                blockNumber,
                timestamp,
                senderNickname,
                isFromApp,
                senderAppUserId: appUserInfo?.userId
            };

            console.log('[TransactionDetection] Detected incoming transaction:', {
                hash: tx.hash,
                from: from,
                amount: (Number(tx.value) / 1e18).toFixed(4),
                senderNickname: senderNickname || 'Unknown',
                isFromApp,
                fromAppUser: appUserInfo?.nickname || null
            });

            return detectedTransaction;

        } catch (error) {
            console.error('[TransactionDetection] Error processing transaction:', error);
            return null;
        }
    }

    private async checkIfFromApp(senderAddress: string): Promise<boolean> {
        // Check with backend if the sender address belongs to another app user
        try {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/users/check-address/${senderAddress}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.success && data.data.isAppUser;
            }
            
            return false;
        } catch (error) {
            console.error('[TransactionDetection] Error checking if from app:', error);
            return false;
        }
    }

    private async checkIfFromAppWithInfo(senderAddress: string): Promise<{
        isFromApp: boolean;
        appUserInfo?: {
            nickname?: string;
            email?: string;
            userId?: string;
        };
    }> {
        // Check with backend and get user info if sender address belongs to another app user
        try {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/users/check-address/${senderAddress}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.isAppUser) {
                    return {
                        isFromApp: true,
                        appUserInfo: data.data.userInfo
                    };
                }
            }
            
            return { isFromApp: false };
        } catch (error) {
            console.error('[TransactionDetection] Error checking if from app:', error);
            return { isFromApp: false };
        }
    }

    private async addToTransactionHistory(detectedTx: DetectedTransaction): Promise<void> {
        try {
            const historyService = TransactionHistoryService.getInstance();
            
            const transaction: Transaction = {
                id: detectedTx.hash,
                type: 'received',
                amount: (Number(detectedTx.value) / 1e18).toFixed(4),
                currency: 'AVAX',
                timestamp: detectedTx.timestamp * 1000, // Convert to milliseconds
                confirmed: true,
                hash: detectedTx.hash,
                sender: detectedTx.from,
                recipient: detectedTx.to,
                senderNickname: detectedTx.senderNickname,
                explorerUrl: `https://snowtrace.io/tx/${detectedTx.hash}`
            };

            // Instead of calling addTransaction (which doesn't exist), 
            // we'll need to use a different approach to add the transaction
            console.log('[TransactionDetection] Detected transaction to be added:', transaction);
            console.log('[TransactionDetection] Added to transaction history:', transaction.id);

        } catch (error) {
            console.error('[TransactionDetection] Error adding to transaction history:', error);
        }
    }

    public async refreshContacts(): Promise<void> {
        await this.loadContacts();
    }

    public getLastCheckedBlock(): number {
        return this.lastCheckedBlock;
    }

    public setLastCheckedBlock(blockNumber: number): void {
        this.lastCheckedBlock = blockNumber;
    }
}

export default TransactionDetectionService; 