export interface TokenInfo {
  symbol: string;
  name: string;
  contractAddress?: string; // SIP-010 contract principal (undefined for native STX)
  decimals: number;
  logoUri?: string;
  isNative?: boolean; // True for native STX token
  networkId: string; // 'mainnet' or 'testnet'
  contractName?: string; // Contract name for SIP-010 tokens
  assetName?: string; // Asset name for SIP-010 tokens
}

// Stacks Mainnet Tokens
export const STACKS_MAINNET_TOKENS: TokenInfo[] = [
  {
    symbol: 'STX',
    name: 'Stacks',
    decimals: 6, // STX uses 6 decimals (microSTX = 1 STX / 1,000,000)
    isNative: true,
    networkId: 'mainnet',
    logoUri: 'https://cryptologos.cc/logos/stacks-stx-logo.png'
  },
  {
    symbol: 'sBTC',
    name: 'Synthetic Bitcoin',
    contractAddress: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token',
    decimals: 8, // Same as Bitcoin
    isNative: false,
    networkId: 'mainnet',
    contractName: 'sbtc-token',
    assetName: 'sbtc',
    logoUri: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png'
  },
  {
    symbol: 'aUSD',
    name: 'aUSD (ALEX)',
    contractAddress: 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-susdt',
    decimals: 8,
    isNative: false,
    networkId: 'mainnet',
    contractName: 'token-susdt',
    assetName: 'bridged-usdt',
    logoUri: 'https://alexgo.io/ausd-logo.png'
  },
  {
    symbol: 'ALEX',
    name: 'ALEX',
    contractAddress: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token',
    decimals: 8,
    isNative: false,
    networkId: 'mainnet',
    contractName: 'age000-governance-token',
    assetName: 'alex',
    logoUri: 'https://alexgo.io/alex-logo.png'
  },
  {
    symbol: 'DIKO',
    name: 'Arkadiko Token',
    contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token',
    decimals: 6,
    isNative: false,
    networkId: 'mainnet',
    contractName: 'arkadiko-token',
    assetName: 'diko',
    logoUri: 'https://arkadiko.finance/diko-logo.png'
  }
];

// Stacks Testnet Tokens (for development)
export const STACKS_TESTNET_TOKENS: TokenInfo[] = [
  {
    symbol: 'STX',
    name: 'Stacks (Testnet)',
    decimals: 6,
    isNative: true,
    networkId: 'testnet',
    logoUri: 'https://cryptologos.cc/logos/stacks-stx-logo.png'
  },
  // Add testnet tokens as needed for testing
];

// All supported tokens
export const ALL_TOKENS = [...STACKS_MAINNET_TOKENS, ...STACKS_TESTNET_TOKENS];

// Helper function to get tokens by network
export function getTokensByNetwork(networkId: string): TokenInfo[] {
  return ALL_TOKENS.filter(token => token.networkId === networkId);
}

// Helper function to find token by symbol and network
export function findToken(symbol: string, networkId: string): TokenInfo | undefined {
  return ALL_TOKENS.find(token =>
    token.symbol.toLowerCase() === symbol.toLowerCase() &&
    token.networkId === networkId
  );
}

// Helper function to get token by contract address
export function findTokenByContract(contractAddress: string, networkId: string): TokenInfo | undefined {
  return ALL_TOKENS.find(token =>
    token.contractAddress === contractAddress &&
    token.networkId === networkId
  );
}

// Helper to format token amount (convert from base units)
export function formatTokenAmount(amount: bigint, token: TokenInfo): string {
  const divisor = BigInt(10 ** token.decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(token.decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  return `${integerPart}.${trimmedFractional}`;
}

// Helper to parse token amount (convert to base units)
export function parseTokenAmount(amount: string, token: TokenInfo): bigint {
  const parts = amount.split('.');
  const integerPart = BigInt(parts[0] || '0');
  const fractionalPart = parts[1] || '';

  const paddedFractional = fractionalPart.padEnd(token.decimals, '0').slice(0, token.decimals);
  const fractionalValue = BigInt(paddedFractional);

  const multiplier = BigInt(10 ** token.decimals);
  return integerPart * multiplier + fractionalValue;
}

// Parse contract principal into parts
export function parseContractPrincipal(contractAddress: string): {
  address: string;
  contractName: string;
} {
  const parts = contractAddress.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid contract principal: ${contractAddress}`);
  }
  return {
    address: parts[0],
    contractName: parts[1]
  };
}

// Default export to suppress Expo Router warning
export default function TokensExport() {
  return null;
}
