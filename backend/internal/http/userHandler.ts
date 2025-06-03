import { Request, Response } from 'express';
import UserService, { UserProfile } from '../users/userService';
import FirestoreService from '../firestore/firestoreService';

/**
 * Interface for the check address response
 */
interface CheckAddressResponse {
    isAppUser: boolean;
    userInfo?: {
        nickname?: string;
        email?: string;
        userId?: string;
    };
}

/**
 * Check if a wallet address belongs to an app user
 * @param req - Express request object
 * @param res - Express response object
 */
export const checkWalletAddressHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { address } = req.params;

        // Validate address format (basic EVM address validation)
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet address format'
            });
        }

        // Search for user with this wallet address
        const users = await FirestoreService.queryDocuments<UserProfile>(
            'users',
            (ref) => ref.where('walletAddress', '==', address.toLowerCase())
        );

        const response: CheckAddressResponse = {
            isAppUser: false
        };

        if (users.length > 0) {
            const user = users[0];
            response.isAppUser = true;
            response.userInfo = {
                nickname: user.name || user.email?.split('@')[0], // Use name or email prefix as nickname
                email: user.email,
                userId: user.googleUserId
            };
        }

        return res.status(200).json({
            success: true,
            data: response
        });

    } catch (error: any) {
        console.error('[checkWalletAddressHandler] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Get user info by wallet address (more detailed endpoint)
 * @param req - Express request object  
 * @param res - Express response object
 */
export const getUserByAddressHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { address } = req.params;

        // Validate address format
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet address format'
            });
        }

        // Search for user with this wallet address
        const users = await FirestoreService.queryDocuments<UserProfile>(
            'users',
            (ref) => ref.where('walletAddress', '==', address.toLowerCase())
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this wallet address'
            });
        }

        const user = users[0];
        
        // Return safe user information (exclude sensitive data)
        const safeUserInfo = {
            userId: user.googleUserId,
            email: user.email,
            name: user.name,
            picture: user.picture,
            walletAddress: user.walletAddress,
            walletNetwork: user.walletNetwork,
            createdAt: user.createdAt,
            // Don't return sensitive data like tokens
        };

        return res.status(200).json({
            success: true,
            data: safeUserInfo
        });

    } catch (error: any) {
        console.error('[getUserByAddressHandler] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}; 