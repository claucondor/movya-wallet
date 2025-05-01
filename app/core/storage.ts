import { MMKV } from 'react-native-mmkv';

// Configura el ID y opcionalmente la clave de encriptación
export const storage = new MMKV({
  id: 'movya-wallet-storage',
  // encryptionKey: 'opcional-clave-secreta' // Descomenta si necesitas encriptación
}); 