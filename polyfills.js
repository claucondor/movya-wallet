// Import react-native-get-random-values FIRST before anything else
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

// Import crypto after setting up Buffer and process
const crypto = require('crypto-browserify');
global.crypto = crypto;

export {};
