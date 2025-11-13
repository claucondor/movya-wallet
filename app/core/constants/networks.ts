export interface NetworkConfig {
  id: string;
  name: string;
  chainName: string;
  chainId: number; // Stacks chain ID
  url: string; // API URL
  coreApiUrl: string; // Core API URL
  explorerUrls: string[];
  isTestnet: boolean;
  version: number; // Transaction version
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    name: 'Stacks Mainnet',
    chainName: 'Stacks',
    chainId: 1, // Mainnet chain ID
    url: 'https://api.mainnet.hiro.so',
    coreApiUrl: 'https://api.mainnet.hiro.so',
    explorerUrls: [
      'https://explorer.hiro.so',
      'https://explorer.stacks.co'
    ],
    isTestnet: false,
    version: 0x00000001, // TransactionVersion.Mainnet
  },
  testnet: {
    id: 'testnet',
    name: 'Stacks Testnet',
    chainName: 'Stacks Testnet',
    chainId: 2147483648, // Testnet chain ID
    url: 'https://api.testnet.hiro.so',
    coreApiUrl: 'https://api.testnet.hiro.so',
    explorerUrls: [
      'https://explorer.hiro.so/?chain=testnet',
      'https://explorer.stacks.co/?chain=testnet'
    ],
    isTestnet: true,
    version: 0x80000000, // TransactionVersion.Testnet
  },
};

// Default network
export const DEFAULT_NETWORK = NETWORKS.mainnet;

// Helper to get transaction version from network
export function getTransactionVersion(networkId: string): number {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown network: ${networkId}`);
  }
  return network.version;
}

// Helper to get explorer URL for transaction
export function getExplorerUrl(txId: string, networkId: string = 'mainnet'): string {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown network: ${networkId}`);
  }
  const baseUrl = network.explorerUrls[0];
  return `${baseUrl}/txid/${txId}${network.isTestnet ? '?chain=testnet' : ''}`;
}

// Helper to get explorer URL for address
export function getAddressExplorerUrl(address: string, networkId: string = 'mainnet'): string {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unknown network: ${networkId}`);
  }
  const baseUrl = network.explorerUrls[0];
  return `${baseUrl}/address/${address}${network.isTestnet ? '?chain=testnet' : ''}`;
}

// Helper to get Hiro API key from environment
export function getHiroApiKey(): string | undefined {
  // In React Native/Expo, use EXPO_PUBLIC_ prefix for public environment variables
  return process.env.EXPO_PUBLIC_HIRO_API_KEY;
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function NetworksExport() {
  return null;
}
