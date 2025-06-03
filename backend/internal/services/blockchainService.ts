import { createPublicClient, createWalletClient, http, parseEther, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche, avalancheFuji } from 'viem/chains';

// Transport con fallbacks para Avalanche Mainnet
const avalancheMainnetTransport = fallback([
  http('https://avalanche-c-chain-rpc.publicnode.com'), // 0.134s
  http('https://api.avax.network/ext/bc/C/rpc'), // 0.405s - oficial
  http('https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc'), // 0.537s
  http('https://avalanche.drpc.org'), // 0.602s
  http('https://0xrpc.io/avax'), // 0.703s
  http('https://avalanche-mainnet.gateway.tenderly.co'), // 0.728s
  http('https://endpoints.omniatech.io/v1/avax/mainnet/public'), // 0.780s
  http('https://avax-pokt.nodies.app/ext/bc/C/rpc'), // 0.799s
  http('https://1rpc.io/avax/c'), // 0.839s
  http('https://avax.meowrpc.com'), // 0.904s
  http('https://rpc.owlracle.info/avax/70d38ce1826c4a60bb2a8e05a6c8b20f'), // 0.917s
  http('https://avalanche.api.onfinality.io/public/ext/bc/C/rpc'),
  http('https://avalancheapi.terminet.io/ext/bc/C/rpc'),
  http('https://avalanche.public-rpc.com')
]);

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
    const networkLower = network.toLowerCase();
    if (networkLower === 'fuji') {
      return { 
        chain: avalancheFuji,
        transport: http() // Usar RPC por defecto para testnet
      };
    } else if (networkLower === 'mainnet') {
      return { 
        chain: avalanche,
        transport: avalancheMainnetTransport // Usar fallbacks para mainnet
      };
    } else {
      throw new Error(`Red no soportada: ${network}`);
    }
  }

  /**
   * Obtener saldo de una dirección
   * @param network - Nombre de la red
   * @param address - Dirección a consultar
   * @returns Saldo en AVAX
   */
  static async getBalance(network: string, address: string): Promise<string> {
    const { chain, transport } = this.getNetworkConfig(network);
    
    const client = createPublicClient({
      chain,
      transport
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
    const { chain, transport } = this.getNetworkConfig(network);
    
    // Obtener la wallet del faucet desde variables de entorno
    const faucetPrivateKey = process.env.FAUCET_PK;
    if (!faucetPrivateKey) {
      throw new Error(`Faucet wallet no configurada para ${network}`);
    }

    const faucetAccount = privateKeyToAccount(faucetPrivateKey as `0x${string}`);

    const client = createWalletClient({
      account: faucetAccount,
      chain,
      transport
    });

    const txHash = await client.sendTransaction({
      to: toAddress as `0x${string}`,
      value: parseEther(amount)
    });

    return txHash;
  }
}

export default BlockchainService; 