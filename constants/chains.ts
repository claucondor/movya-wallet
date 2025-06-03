// import { Chain } from '@privy-io/expo';

export const avalanche = {
  id: 43114,
  name: 'Avalanche',
  rpcUrls: {
    default: { 
      http: [
        // Ordenados por latencia (más rápidos primero)
        'https://avalanche-c-chain-rpc.publicnode.com', // 0.134s
        'https://api.avax.network/ext/bc/C/rpc', // 0.405s - oficial
        'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc', // 0.537s
        'https://avalanche.drpc.org', // 0.602s
        'https://0xrpc.io/avax', // 0.703s
        'https://avalanche-mainnet.gateway.tenderly.co', // 0.728s
        'https://endpoints.omniatech.io/v1/avax/mainnet/public', // 0.780s
        'https://avax-pokt.nodies.app/ext/bc/C/rpc', // 0.799s
        'https://1rpc.io/avax/c', // 0.839s
        'https://avax.meowrpc.com', // 0.904s
        'https://rpc.owlracle.info/avax/70d38ce1826c4a60bb2a8e05a6c8b20f', // 0.917s
        // Adicionales sin latencia específica como último recurso
        'https://avalanche.api.onfinality.io/public/ext/bc/C/rpc',
        'https://avalancheapi.terminet.io/ext/bc/C/rpc',
        'https://avalanche.public-rpc.com'
      ]
    },
    public: { 
      http: [
        // Misma configuración para public
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
      ]
    }
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

export const avalancheFuji = {
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