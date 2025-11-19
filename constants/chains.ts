// Stacks blockchain configuration

export const stacksMainnet = {
  id: 1, // Stacks Mainnet chain ID
  name: 'Stacks',
  apiUrls: {
    default: {
      http: [
        'https://api.hiro.so', // Official Hiro API
        'https://api.mainnet.hiro.so',
      ]
    },
    public: {
      http: [
        'https://api.hiro.so',
        'https://api.mainnet.hiro.so',
      ]
    }
  },
  blockExplorers: {
    default: { name: 'Stacks Explorer', url: 'https://explorer.hiro.so' }
  },
  nativeCurrency: {
    decimals: 6,
    name: 'Stacks',
    symbol: 'STX'
  }
};

export const stacksTestnet = {
  id: 2147483648, // Stacks Testnet chain ID
  name: 'Stacks Testnet',
  apiUrls: {
    default: { http: ['https://api.testnet.hiro.so'] },
    public: { http: ['https://api.testnet.hiro.so'] }
  },
  blockExplorers: {
    default: { name: 'Stacks Testnet Explorer', url: 'https://explorer.hiro.so/?chain=testnet' }
  },
  nativeCurrency: {
    decimals: 6,
    name: 'Stacks',
    symbol: 'STX'
  }
};

// Export default as mainnet for backward compatibility
export const stacks = stacksMainnet;
