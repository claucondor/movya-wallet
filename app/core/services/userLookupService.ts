import Constants from 'expo-constants';

/**
 * User Lookup Service
 * Handles API calls to check if wallet addresses belong to app users
 */

export interface UserLookupResult {
    isAppUser: boolean;
    userInfo?: {
        nickname?: string;
        email?: string;
        userId?: string;
    };
}

export interface DetailedUserInfo {
    userId: string;
    email?: string;
    name?: string;
    picture?: string;
    walletAddress: string;
    walletNetwork?: string;
    createdAt?: Date;
}

export interface UserProfile {
    userId: string;
    email?: string;
    name?: string;
    picture?: string;
    walletAddress: string;
    walletNetwork?: string;
    walletType?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

class UserLookupService {
    private static instance: UserLookupService;
    private backendUrl: string;

    private constructor() {
        this.backendUrl = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:3000';
    }

    public static getInstance(): UserLookupService {
        if (!UserLookupService.instance) {
            UserLookupService.instance = new UserLookupService();
        }
        return UserLookupService.instance;
    }

    /**
     * Check if a wallet address belongs to an app user
     * @param address - Wallet address to check
     * @returns Promise with lookup result
     */
    public async checkWalletAddress(address: string): Promise<UserLookupResult> {
        try {
            if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
                return { isAppUser: false };
            }

            const response = await fetch(`${this.backendUrl}/users/check-address/${address}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.data;
                }
            }

            return { isAppUser: false };

        } catch (error) {
            console.error('[UserLookupService] Error checking wallet address:', error);
            return { isAppUser: false };
        }
    }

    /**
     * Get detailed user information by wallet address (requires authentication)
     * @param address - Wallet address
     * @param authToken - Authentication token
     * @returns Promise with detailed user info
     */
    public async getUserByAddress(address: string, authToken?: string): Promise<DetailedUserInfo | null> {
        try {
            if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
                return null;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${this.backendUrl}/users/by-address/${address}`, {
                method: 'GET',
                headers,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.data;
                }
            }

            return null;

        } catch (error) {
            console.error('[UserLookupService] Error getting user by address:', error);
            return null;
        }
    }

    /**
     * Get user profile by user ID (requires authentication)
     * @param userId - User ID
     * @param authToken - Authentication token (optional, will use storage if not provided)
     * @returns Promise with user profile
     */
    public async getUserProfile(userId: string, authToken?: string): Promise<UserProfile | null> {
        try {
            if (!userId) {
                console.log('[UserLookupService] No userId provided');
                return null;
            }

            const url = `${this.backendUrl}/users/profile/${userId}`;
            console.log('[UserLookupService] Fetching user profile from:', url);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            console.log('[UserLookupService] Request headers:', headers);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            console.log('[UserLookupService] Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[UserLookupService] Response data:', data);
                if (data.success) {
                    return data.data;
                }
            } else {
                const errorText = await response.text();
                console.error('[UserLookupService] Response error:', errorText);
            }

            return null;

        } catch (error) {
            console.error('[UserLookupService] Error getting user profile:', error);
            return null;
        }
    }

    /**
     * Batch check multiple addresses
     * @param addresses - Array of wallet addresses to check
     * @returns Promise with map of address to lookup result
     */
    public async checkMultipleAddresses(addresses: string[]): Promise<Map<string, UserLookupResult>> {
        const results = new Map<string, UserLookupResult>();
        
        // Use Promise.allSettled to handle multiple concurrent requests
        const promises = addresses.map(async (address) => {
            const result = await this.checkWalletAddress(address);
            return { address, result };
        });

        const settledResults = await Promise.allSettled(promises);

        settledResults.forEach((settledResult) => {
            if (settledResult.status === 'fulfilled') {
                const { address, result } = settledResult.value;
                results.set(address.toLowerCase(), result);
            }
        });

        return results;
    }
}

export default UserLookupService; 