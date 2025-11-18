// Import react-native-get-random-values FIRST before anything else
// This sets up global.crypto.getRandomValues automatically
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

// Setup crypto object before loading crypto-browserify
if (typeof global.crypto !== 'object') {
  global.crypto = {};
}

// Preserve getRandomValues from react-native-get-random-values
const getRandomValues = global.crypto.getRandomValues;

// Import crypto-browserify
const cryptoBrowserify = require('crypto-browserify');

// Replace global.crypto with crypto-browserify
global.crypto = cryptoBrowserify;

// Restore getRandomValues from react-native-get-random-values
global.crypto.getRandomValues = getRandomValues;

// Setup crypto.web for @stacks libraries that use crypto.web.getRandomValues
global.crypto.web = {
  getRandomValues: getRandomValues,
  subtle: global.crypto.subtle || {}
};

export {};
