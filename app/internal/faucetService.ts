import Constants from 'expo-constants';
import { storage } from '../core/storage';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://localhost:8080';
const FAUCET_USED_KEY = 'faucetUsedTimestamp'; // Para controlar cuando se usó el faucet por última vez

/**
 * Solicita tokens STX desde el faucet para la dirección proporcionada
 * @param userId ID del usuario
 * @param address Dirección de la wallet
 * @param network Red de blockchain (testnet o mainnet)
 * @returns
 */
export async function requestFaucetTokens(userId: string, address: string, network: 'testnet' | 'mainnet' = 'testnet'): Promise<{
  success: boolean;
  message: string;
  txHash?: string;
  error?: string;
}> {
  try {
    // Verificar si ya se ha usado el faucet recientemente (últimas 24 horas)
    const lastUsedTimestamp = storage.getNumber(`${FAUCET_USED_KEY}_${userId}`);
    const now = Date.now();
    
    // Si se usó en las últimas 24 horas, cancelar
    if (lastUsedTimestamp && now - lastUsedTimestamp < 24 * 60 * 60 * 1000) {
      const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - lastUsedTimestamp)) / (60 * 60 * 1000));
      return {
        success: false,
        message: `Debes esperar ${hoursLeft} horas antes de usar el faucet nuevamente.`,
        error: 'COOLDOWN_PERIOD'
      };
    }

    // Obtener el token si existe
    const token = storage.getString('userToken');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Añadir el token si existe
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`[Faucet] Solicitando tokens para ${address} en red ${network}`);

    // Hacer la solicitud al endpoint del faucet
    const response = await fetch(`${BACKEND_URL}/faucet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        network,
        address,
        userId
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Guardar timestamp de uso del faucet
      storage.set(`${FAUCET_USED_KEY}_${userId}`, now);
      
      return {
        success: true,
        message: 'Tokens recibidos correctamente',
        txHash: data.txHash
      };
    } else {
      // Si el error es porque el balance es demasiado alto, podemos ignorarlo
      if (response.status === 400 && data.error?.includes('balance is too high')) {
        return {
          success: true,
          message: 'No se requieren tokens adicionales ya que el balance es suficiente',
        };
      }
      
      // Si el error es por período de enfriamiento
      if (response.status === 429) {
        // Guardar el timestamp del último uso (viene del servidor)
        const lastFaucetUse = new Date(data.lastFaucetUse).getTime();
        storage.set(`${FAUCET_USED_KEY}_${userId}`, lastFaucetUse);
        
        const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - lastFaucetUse)) / (60 * 60 * 1000));
        return {
          success: false,
          message: `Debes esperar ${hoursLeft} horas antes de usar el faucet nuevamente.`,
          error: 'COOLDOWN_PERIOD'
        };
      }
      
      return {
        success: false,
        message: `Error: ${data.error || 'No se pudieron solicitar tokens del faucet'}`,
        error: data.error
      };
    }
  } catch (error: any) {
    console.error('[Faucet] Error solicitando tokens:', error);
    return {
      success: false,
      message: `Error de conexión: ${error.message}`,
      error: error.message
    };
  }
}

// Add a default export to suppress Expo Router "missing default export" warning
export default function FaucetServiceExport() {
  return null; // This will never be rendered
} 