export interface TokenInfo {
    symbol: string;
    name: string;
    address?: string; // Optional: Contract address on a specific network
    decimals: number;
    logoUri?: string; // Optional: URL to token logo
  }

  // Example Token List - Replace with actual data and potentially network-specific lists
  export const SWAP_TOKENS: TokenInfo[] = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoUri: 'https://example.com/logos/eth.png' // Replace with actual logo URL
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      // Example address (replace with actual contract address on the relevant network)
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      logoUri: 'https://example.com/logos/usdc.png' // Replace with actual logo URL
    },
    {
      symbol: 'MVY',
      name: 'Movya Token',
      // Example address (replace with actual contract address on the relevant network)
      address: '0x123...', // Placeholder address
      decimals: 18,
      logoUri: 'https://example.com/logos/mvy.png' // Replace with actual logo URL
    },
    // Add more tokens as needed
  ];

// Add a default export to suppress Expo Router "missing default export" warning
export default function TokensExport() {
  return null; // This will never be rendered
}