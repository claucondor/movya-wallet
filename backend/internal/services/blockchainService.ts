import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from 'viem/chains';

// Configuración de redes
const NETWORK_CONFIGS = {
  fuji: {
    chain: avalancheFuji,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
  },
  mainnet: {
    chain: avalanche,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
  }
};

/**
 * Servicio de operaciones blockchain
 */
class BlockchainService {
  /**
   * Obtener configuración de red
   * @param network - Nombre de la red (fuji o mainnet)
   * @returns Configuración de red
   */
  private static getNetworkConfig(network: string) {
    const config = NETWORK_CONFIGS[network.toLowerCase()];
    if (!config) {
      throw new Error(`Red no soportada: ${network}`);
    }
    return config;
  }

  /**
   * Obtener saldo de una dirección
   * @param network - Nombre de la red
   * @param address - Dirección a consultar
   * @returns Saldo en AVAX
   */
  static async getBalance(network: string, address: string): Promise<string> {
    const { chain, rpcUrl } = this.getNetworkConfig(network);
    
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    const balance = await client.getBalance({ address: address as `0x${string}` });
    return balance.toString(); // Devuelve el saldo en wei
  }

  /**
   * Enviar AVAX a una dirección
   * @param network - Nombre de la red
   * @param toAddress - Dirección de destino
   * @param amount - Cantidad de AVAX a enviar
   * @returns Hash de la transacción
   */
  static async sendAVAX(network: string, toAddress: string, amount: string): Promise<string> {
    const { chain, rpcUrl } = this.getNetworkConfig(network);
    
    // Obtener la wallet del faucet desde variables de entorno
    const faucetPrivateKey = process.env[`${network.toUpperCase()}_FAUCET_PK`];
    if (!faucetPrivateKey) {
      throw new Error(`Faucet wallet no configurada para ${network}`);
    }

    const faucetAccount = privateKeyToAccount(faucetPrivateKey as `0x${string}`);

    const client = createWalletClient({
      account: faucetAccount,
      chain,
      transport: http(rpcUrl)
    });

    const txHash = await client.sendTransaction({
      to: toAddress as `0x${string}`,
      value: parseEther(amount)
    });

    return txHash;
  }
}

export default BlockchainService; 