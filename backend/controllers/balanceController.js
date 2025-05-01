const balanceService = require('../services/balanceService');
const { ethers } = require("ethers"); // For address validation
const { isValidNetwork } = require("../config/blockchainNetworks");

/**
 * Gets the native balance for a given address.
 * Address is expected as a URL parameter.
 * Network ('mainnet' or 'fuji') is expected as a query parameter (defaults to 'mainnet').
 */
const getNativeBalance = async (req, res) => {
    const { address } = req.params;
    const { network = 'mainnet' } = req.query; // Get network from query param

    if (!address || !ethers.utils.isAddress(address)) {
        return res.status(400).json({ message: 'Valid address parameter is required.' });
    }

    if (!isValidNetwork(network)) {
        return res.status(400).json({ message: `Invalid network query parameter: ${network}. Use 'mainnet' or 'fuji'.` });
    }

    // Optional: Validate that the requesting user owns this address
    // Requires user info from auth middleware and potentially fetching user data

    try {
        const balance = await balanceService.getNativeBalance(address, network);
        res.status(200).json({ address, balance, network });
    } catch (error) {
        console.error(`Error fetching native balance on ${network}:`, error);
        res.status(500).json({ message: 'Failed to fetch native balance', error: error.message });
    }
};

/**
 * Gets the ERC20 token balance for a given user address and token contract address.
 * Addresses are expected as URL parameters.
 * Network ('mainnet' or 'fuji') is expected as a query parameter (defaults to 'mainnet').
 */
const getTokenBalance = async (req, res) => {
    const { userAddress, tokenAddress } = req.params;
    const { network = 'mainnet' } = req.query; // Get network from query param

    if (!userAddress || !ethers.utils.isAddress(userAddress)) {
        return res.status(400).json({ message: 'Valid userAddress parameter is required.' });
    }
    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
        return res.status(400).json({ message: 'Valid tokenAddress parameter is required.' });
    }

    if (!isValidNetwork(network)) {
        return res.status(400).json({ message: `Invalid network query parameter: ${network}. Use 'mainnet' or 'fuji'.` });
    }

    // Optional: Validate that the requesting user owns the userAddress

    try {
        const balance = await balanceService.getTokenBalance(userAddress, tokenAddress, network);
        res.status(200).json({ userAddress, tokenAddress, balance, network });
    } catch (error) {
        console.error(`Error fetching token balance on ${network}:`, error);
        res.status(500).json({ message: 'Failed to fetch token balance', error: error.message });
    }
};

module.exports = {
    getNativeBalance,
    getTokenBalance,
}; 