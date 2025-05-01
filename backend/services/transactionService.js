const { ethers } = require("ethers");
const { getNetworkConfig, isValidNetwork } = require("../config/blockchainNetworks");

/**
 * Sends a pre-signed transaction to the specified Avalanche network (Mainnet or Fuji).
 *
 * @param {string} signedTx - The signed transaction hex string.
 * @param {string} [network='mainnet'] - The target network ('mainnet' or 'fuji'). Defaults to 'mainnet'.
 * @returns {Promise<ethers.providers.TransactionResponse>} - The transaction response.
 */
const sendSignedTransaction = async (signedTx, network = 'mainnet') => {
    if (!isValidNetwork(network)) {
        throw new Error(`Unsupported network: ${network}. Use 'mainnet' or 'fuji'.`);
    }
    const networkConfig = getNetworkConfig(network);

    if (!signedTx || !ethers.utils.isHexString(signedTx)) {
        throw new Error("Invalid signed transaction format.");
    }

    const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

    try {
        console.log(`Sending signed transaction to ${networkConfig.name}...`);
        const txResponse = await provider.sendTransaction(signedTx);
        console.log(`Transaction sent to ${network}: ${txResponse.hash}`);
        return txResponse;
    } catch (error) {
        console.error(`Error sending transaction on ${network}:`, error);
        // Provide more specific error feedback if possible
        if (error.code === 'REPLACEMENT_UNDERPRICED') {
            throw new Error("Transaction failed: Replacement transaction underpriced. Try increasing gas price.");
        } else if (error.message.includes('insufficient funds')) {
            throw new Error("Transaction failed: Insufficient AVAX funds for gas.");
        }
        throw new Error(`Failed to send transaction on ${network}: ${error.message}`);
    }
};

module.exports = {
    sendSignedTransaction,
}; 