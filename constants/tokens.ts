export interface TokenInfo {
  symbol: string;
  name: string;
  address?: string; // undefined for native tokens like AVAX
  decimals: number;
  chainId: number;
  isNative?: boolean;
  logo?: string;
}

// Avalanche Mainnet Token Addresses
export const AVALANCHE_TOKENS: Record<string, TokenInfo> = {
  AVAX: {
    symbol: 'AVAX',
    name: 'Avalanche',
    decimals: 18,
    chainId: 43114,
    isNative: true,
  },
  WAVAX: {
    symbol: 'WAVAX',
    name: 'Wrapped AVAX',
    address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    decimals: 18,
    chainId: 43114,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    decimals: 6,
    chainId: 43114,
  },
};

// Supported tokens for the wallet
export const SUPPORTED_TOKENS = ['AVAX', 'WAVAX', 'USDC'] as const;
export type SupportedToken = typeof SUPPORTED_TOKENS[number];

// Helper functions
export const getTokenInfo = (symbol: SupportedToken): TokenInfo => {
  return AVALANCHE_TOKENS[symbol];
};

export const isNativeToken = (symbol: string): boolean => {
  return AVALANCHE_TOKENS[symbol]?.isNative === true;
};

export const getTokenAddress = (symbol: SupportedToken): string | undefined => {
  return AVALANCHE_TOKENS[symbol]?.address;
};

// WAVAX Contract address for wrap/unwrap operations
export const WAVAX_CONTRACT_ADDRESS = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';

// Token pair mappings for wrap/unwrap
export const WRAP_PAIRS = {
  AVAX: 'WAVAX',
  WAVAX: 'AVAX',
} as const; 