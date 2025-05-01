const transactionService = require('../services/transactionService');
const { isValidNetwork } = require("../config/blockchainNetworks");

/**
 * Handles sending a signed transaction.
 * Expects the signed transaction hex string and optionally the network ('mainnet' or 'fuji')
 * in the request body. Defaults to 'mainnet'.
 */
const sendTransaction = async (req, res) => {
    // Optional: Add validation to ensure the request comes from the authenticated user
    // const userId = req.user?.id;
    // if (!userId) {
    //     return res.status(401).json({ message: 'Authentication required.' });
    // }

    const { signedTx, network = 'mainnet' } = req.body;

    if (!signedTx) {
        return res.status(400).json({ message: 'Missing signedTx in request body.' });
    }

    if (!isValidNetwork(network)) {
        return res.status(400).json({ message: `Invalid network: ${network}. Use 'mainnet' or 'fuji'.` });
    }

    try {
        const txResponse = await transactionService.sendSignedTransaction(signedTx, network);
        res.status(200).json({ 
            message: `Transaction sent successfully to ${network}.`, 
            transactionHash: txResponse.hash,
            network: network,
        });
    } catch (error) {
        console.error(`Transaction sending failed on ${network}:`, error);
        res.status(500).json({ message: 'Failed to send transaction', error: error.message });
    }
};

module.exports = {
    sendTransaction,
}; 