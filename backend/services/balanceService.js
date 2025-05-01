const { ethers } = require("ethers");
const { getNetworkConfig, isValidNetwork } = require("../config/blockchainNetworks");

// Minimal ABI for ERC20 balance check
const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

/**
 * Gets the native token balance (AVAX) for a given address on the specified network.
 *
 * @param {string} address - The wallet address.
 * @param {string} [network='mainnet'] - The target network ('mainnet' or 'fuji').
 * @returns {Promise<string>} - The balance formatted as a string (in AVAX).
 */
const getNativeBalance = async (address, network = 'mainnet') => {
    if (!isValidNetwork(network)) throw new Error(`Unsupported network: ${network}. Use 'mainnet' or 'fuji'.`);
    const networkConfig = getNetworkConfig(network);

    if (!ethers.utils.isAddress(address)) throw new Error("Invalid address format.");

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

    try {
        const balance = await provider.getBalance(address);
        return ethers.utils.formatEther(balance); // AVAX uses 18 decimals like Ether
    } catch (error) {
        console.error(`Error fetching native balance on ${network}:`, error);
        throw new Error(`Could not fetch native balance on ${network}.`);
    }
};

/**
 * Gets the ERC20 token balance for a given address and token contract on the specified network.
 *
 * @param {string} userAddress - The user's wallet address.
 * @param {string} tokenAddress - The ERC20 token contract address.
 * @param {string} [network='mainnet'] - The target network ('mainnet' or 'fuji').
 * @returns {Promise<string>} - The token balance formatted as a string.
 */
const getTokenBalance = async (userAddress, tokenAddress, network = 'mainnet') => {
    if (!isValidNetwork(network)) throw new Error(`Unsupported network: ${network}. Use 'mainnet' or 'fuji'.`);
    const networkConfig = getNetworkConfig(network);

    if (!ethers.utils.isAddress(userAddress)) throw new Error("Invalid user address format.");
    if (!ethers.utils.isAddress(tokenAddress)) throw new Error("Invalid token address format.");

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

    try {
        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(userAddress);
        const decimals = await tokenContract.decimals();
        return ethers.utils.formatUnits(balance, decimals); // Format using token decimals
    } catch (error) {
        console.error(`Error fetching token balance for ${tokenAddress} on ${network}:`, error);
        throw new Error(`Could not fetch balance for token ${tokenAddress} on ${network}.`);
    }
};

module.exports = {
    getNativeBalance,
    getTokenBalance,
}; 