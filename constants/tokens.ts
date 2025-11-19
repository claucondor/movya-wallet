export interface TokenInfo {
  symbol: string;
  name: string;
  address?: string; // undefined for native tokens like STX
  decimals: number;
  chainId: number;
  isNative?: boolean;
  logo?: string;
}

// Stacks Mainnet Token Addresses
export const STACKS_TOKENS: Record<string, TokenInfo> = {
  STX: {
    symbol: 'STX',
    name: 'Stacks',
    decimals: 6,
    chainId: 1, // Stacks Mainnet
    isNative: true,
  },
  // Add popular Stacks tokens here in the future
  // USDA: Stacks USD stablecoin
  // sBTC: Synthetic Bitcoin on Stacks
};

// Supported tokens for the wallet
export const SUPPORTED_TOKENS = ['STX'] as const;
export type SupportedToken = typeof SUPPORTED_TOKENS[number];

// Helper functions
export const getTokenInfo = (symbol: SupportedToken): TokenInfo => {
  return STACKS_TOKENS[symbol];
};

export const isNativeToken = (symbol: string): boolean => {
  return STACKS_TOKENS[symbol]?.isNative === true;
};

export const getTokenAddress = (symbol: SupportedToken): string | undefined => {
  return STACKS_TOKENS[symbol]?.address;
}; 