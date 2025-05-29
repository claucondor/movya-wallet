export interface NetworkConfig {
  id: number;
  name: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  isTestnet: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  avalanche: {
    id: 43114,
    name: 'Avalanche Mainnet',
    chainName: 'Avalanche C-Chain',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
    ],
    blockExplorerUrls: ['https://snowtrace.io'],
    isTestnet: false,
  },
  avalanche_fuji: {
    id: 43113,
    name: 'Avalanche Fuji Testnet',
    chainName: 'Avalanche Fuji C-Chain',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: [
      'https://api.avax-test.network/ext/bc/C/rpc',
    ],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    isTestnet: true,
  },
};

// Default network
export const DEFAULT_NETWORK = NETWORKS.avalanche;

// Add a default export to suppress Expo Router "missing default export" warning
export default function NetworksExport() {
  return null;
} 