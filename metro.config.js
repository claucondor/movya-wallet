const { getDefaultConfig, mergeConfig } = require("@expo/metro-config");

/**
 * Metro configuration
 * https://metrobundler.dev/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);
// Configuración simplificada sin referencias a @privy-io/expo

module.exports = config;