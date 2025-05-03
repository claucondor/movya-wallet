// Definir interfaces para mejor tipado
interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
}

interface NetworkConfigs {
  [key: string]: NetworkConfig;
}

interface BlockchainNetworks {
  networks: NetworkConfigs;
  getNetworkConfig: (networkName: string) => NetworkConfig | null;
  isValidNetwork: (networkName: string) => boolean;
}

const blockchainNetworks: BlockchainNetworks = {
  networks: {
    mainnet: {
      name: "Avalanche Mainnet",
      rpcUrl: process.env.AVALANCHE_MAINNET_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      explorerUrl: "https://snowtrace.io/",
    },
    fuji: {
      name: "Avalanche Fuji Testnet",
      rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      explorerUrl: "https://testnet.snowtrace.io/",
    },
  },

  getNetworkConfig(networkName: string): NetworkConfig | null {
    return this.networks[networkName] || null;
  },

  isValidNetwork(networkName: string): boolean {
    return Object.keys(this.networks).includes(networkName);
  },
};

export default blockchainNetworks; 