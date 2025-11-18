// Polyfills for Node.js modules required by @stacks/* libraries
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
global.Buffer = Buffer;
global.process = process;

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = __DEV__ ? 'development' : 'production';
}

// Use react-native-quick-crypto for comprehensive crypto support
const QuickCrypto = require('react-native-quick-crypto');

// Install quick-crypto polyfill
QuickCrypto.install();

// Setup crypto.web for @stacks libraries that use crypto.web.getRandomValues
if (global.crypto && !global.crypto.web) {
  global.crypto.web = {
    getRandomValues: global.crypto.getRandomValues,
    subtle: global.crypto.subtle || {}
  };
}

export {};
