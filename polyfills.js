// Import react-native-get-random-values FIRST
import 'react-native-get-random-values';

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

// Setup a minimal shim that delegates to the proper implementations
const crypto = require('crypto-browserify');

// Make crypto global
global.crypto = crypto;

// Ensure getRandomValues from react-native-get-random-values is used
// (it should already be set, but we make sure)
if (!global.crypto.getRandomValues && typeof crypto.randomBytes === 'function') {
  global.crypto.getRandomValues = function(arr) {
    const bytes = crypto.randomBytes(arr.length);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = bytes[i];
    }
    return arr;
  };
}

// Setup crypto.web for @stacks libraries
global.crypto.web = global.crypto.web || {};
global.crypto.web.getRandomValues = global.crypto.getRandomValues;
global.crypto.web.subtle = global.crypto.subtle || {};

export {};
