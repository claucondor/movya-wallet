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
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://api.avax.network/ext/bc/C/rpc',
      'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
      'https://avalanche.drpc.org',
      'https://0xrpc.io/avax',
      'https://avalanche-mainnet.gateway.tenderly.co',
      'https://endpoints.omniatech.io/v1/avax/mainnet/public',
      'https://avax-pokt.nodies.app/ext/bc/C/rpc',
      'https://1rpc.io/avax/c',
      'https://avax.meowrpc.com',
      'https://rpc.owlracle.info/avax/70d38ce1826c4a60bb2a8e05a6c8b20f',
      'https://avalanche.api.onfinality.io/public/ext/bc/C/rpc',
      'https://avalancheapi.terminet.io/ext/bc/C/rpc',
      'https://avalanche.public-rpc.com'
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