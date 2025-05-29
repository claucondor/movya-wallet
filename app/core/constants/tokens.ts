export interface TokenInfo {
    symbol: string;
    name: string;
    address?: string; // Optional: Contract address (undefined for native tokens)
    decimals: number;
    logoUri?: string;
    isNative?: boolean; // True for native network tokens like AVAX, ETH
    networkId: number; // Network where this token exists
  }

  // Avalanche Mainnet Tokens
  export const AVALANCHE_TOKENS: TokenInfo[] = [
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 18,
      isNative: true,
      networkId: 43114,
      logoUri: 'https://cryptologos.cc/logos/avalanche-avax-logo.png'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC.e on Avalanche
      decimals: 6,
      isNative: false,
      networkId: 43114,
      logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      symbol: 'USDC.e',
      name: 'USD Coin (Bridged)',
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      decimals: 6,
      isNative: false,
      networkId: 43114,
      logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
  ];

  // Legacy tokens (keeping for backward compatibility)
  export const SWAP_TOKENS: TokenInfo[] = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      networkId: 1,
      logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      networkId: 1,
      logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      symbol: 'MVY',
      name: 'Movya Token',
      address: '0x123...', // Placeholder address
      decimals: 18,
      networkId: 1,
      logoUri: 'https://example.com/logos/mvy.png'
    },
  ];

  // All supported tokens
  export const ALL_TOKENS = [...AVALANCHE_TOKENS, ...SWAP_TOKENS];

  // Helper function to get tokens by network
  export function getTokensByNetwork(networkId: number): TokenInfo[] {
    return ALL_TOKENS.filter(token => token.networkId === networkId);
  }

  // Helper function to find token by symbol and network
  export function findToken(symbol: string, networkId: number): TokenInfo | undefined {
    return ALL_TOKENS.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase() && 
      token.networkId === networkId
    );
  }

  // Default export to suppress Expo Router warning
  export default function TokensExport() {
    return null;
  }