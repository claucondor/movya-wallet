// Polyfills for Node.js modules required by @stacks/* libraries
import { Buffer } from 'buffer';
import process from 'process';
import crypto from 'crypto-browserify';

// Make Buffer and process available globally
global.Buffer = Buffer;
global.process = process;
global.crypto = crypto;

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = __DEV__ ? 'development' : 'production';
}

export {};
