module.exports = {
    networks: {
        mainnet: { // Avalanche Mainnet C-Chain
            name: "Avalanche Mainnet",
            rpcUrl: process.env.AVALANCHE_MAINNET_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
            chainId: 43114,
            explorerUrl: "https://snowtrace.io/", // Optional: for generating links
        },
        fuji: { // Avalanche Fuji Testnet C-Chain
            name: "Avalanche Fuji Testnet",
            rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
            chainId: 43113,
            explorerUrl: "https://testnet.snowtrace.io/", // Optional
        },
        // Add other Avalanche chains (X-Chain, P-Chain) or other networks if needed later
    },

    /**
     * Gets the configuration for a specific network.
     * @param {string} networkName - 'mainnet' or 'fuji'.
     * @returns {object|null} Network configuration object or null if not found.
     */
    getNetworkConfig: (networkName) => {
        return module.exports.networks[networkName] || null;
    },

     /**
      * Validates if the provided network name is supported.
      * @param {string} networkName - The network name to validate.
      * @returns {boolean} True if the network is supported, false otherwise.
      */
    isValidNetwork: (networkName) => {
        return Object.keys(module.exports.networks).includes(networkName);
    }
}; 