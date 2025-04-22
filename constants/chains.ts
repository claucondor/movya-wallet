import { Chain } from '@privy-io/expo';

export const avalanche: Chain = {
  id: 43114,
  name: 'Avalanche',
  rpcUrls: {
    default: { http: ['https://api.avax.network/ext/bc/C/rpc'] },
    public: { http: ['https://api.avax.network/ext/bc/C/rpc'] }
  },
  blockExplorers: {
    default: { name: 'Snowtrace', url: 'https://snowtrace.io' }
  },
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX'
  }
};

export const avalancheFuji: Chain = {
  id: 43113,
  name: 'Avalanche Fuji',
  rpcUrls: {
    default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] }
  },
  blockExplorers: {
    default: { name: 'Snowtrace Testnet', url: 'https://testnet.snowtrace.io' }
  },
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX'
  }
};