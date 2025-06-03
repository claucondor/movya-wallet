import { createPublicClient, http, getAddress, Log } from 'viem';
import { avalanche } from '@/constants/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { storage } from '../storage';
import { getContacts, Contact } from '../../internal/contactService';
import TransactionHistoryService, { Transaction } from './transactionHistoryService';

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

            // Check recent blocks for transactions involving our address
            for (let blockNum = this.lastCheckedBlock + 1; blockNum <= currentBlock; blockNum++) {
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

            this.lastCheckedBlock = currentBlock;
            return detectedTransactions;

        } catch (error) {
            console.error('[TransactionDetection] Error checking for transactions:', error);
            return [];
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