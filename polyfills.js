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

// After react-native-get-random-values is imported, global.crypto.getRandomValues should exist
// Setup crypto.web for @stacks libraries that use crypto.web.getRandomValues
if (!global.crypto.web) {
  global.crypto.web = {
    getRandomValues: global.crypto.getRandomValues,
    subtle: global.crypto.subtle || {}
  };
}

// Import crypto-browserify after setting up the web crypto API
const cryptoBrowserify = require('crypto-browserify');
// Merge crypto-browserify functions into global.crypto without overwriting web
Object.keys(cryptoBrowserify).forEach(key => {
  if (key !== 'web' && key !== 'getRandomValues') {
    global.crypto[key] = cryptoBrowserify[key];
  }
});

export {};
