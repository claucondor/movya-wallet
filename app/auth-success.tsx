import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext'; // Assuming ThemeContext exists
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'; // Import viem functions
import { storage } from './core/storage'; // Import MMKV storage
import { checkBalanceAndRequestFaucet, saveWalletToBackend } from './internal/walletService'; // Importar la función para guardar en el backend

// Define a key for storing the private key
const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function AuthSuccessScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log('Auth Success: User ID received:', userId);

    const handleWallet = async () => {
      try {
        // Store the userId if provided
        if (userId) {
          storage.set('userId', userId);
          console.log('User ID stored in secure storage:', userId);
        }
        
        // Use MMKV's synchronous getString
        let privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);
        let account;

        if (!privateKey) {
          console.log('No private key found, generating a new wallet...');
          privateKey = generatePrivateKey();
          account = privateKeyToAccount(privateKey as `0x${string}`);
          // Use MMKV's synchronous set
          storage.set(PRIVATE_KEY_STORAGE_KEY, privateKey);
          console.log('New wallet generated and private key stored securely for address:', account.address);
        } else {
          account = privateKeyToAccount(privateKey as `0x${string}`);
          console.log('Existing private key loaded securely for address:', account.address);
        }

        // Si tenemos un userId, intentamos guardar la wallet en el backend (solo una vez)
        if (userId) {
          try {
            // 1. Guardar la wallet en el backend
            setStatusMessage('Sincronizando wallet con el backend...');
            const saved = await saveWalletToBackend(userId);
            if (saved) {
              console.log('Wallet address saved in backend for user:', userId);
            } else {
              console.log('Could not save wallet address in backend. Will try again on next login.');
            }

            // 2. Verificar balance y solicitar tokens si es necesario
            setStatusMessage('Verificando balance de la wallet...');
            const balanceCheck = await checkBalanceAndRequestFaucet(userId);
            
            if (balanceCheck.faucetUsed) {
              setStatusMessage(`Tokens solicitados del faucet. Balance actual: ${balanceCheck.currentBalance} AVAX`);
              // Dar tiempo para que el usuario vea el mensaje
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (backendError) {
            console.error('Error interacting with backend:', backendError);
            // No bloqueamos la navegación si falla
          }
        }

        // Redirect after handling the wallet
        // Using replace to prevent going back to the success screen
        router.replace('/wallet');

      } catch (error) {
        console.error('Error handling wallet:', error);
        // Handle error appropriately, maybe redirect to an error screen or show an alert
        router.replace('/wallet'); // Consider redirecting to an error page or /auth-error
      }
    };

    // Call the function to handle wallet logic
    handleWallet();

  }, [userId]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
      <ThemedText type="subtitle" style={styles.message}>
        Authentication Successful!
      </ThemedText>
      <ThemedText style={styles.message}>
        {statusMessage || 'Welcome back! Redirecting you now...'}
      </ThemedText>
      {userId && (
        <ThemedText style={styles.userIdText}>
          (User ID: {userId})
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    marginTop: 20,
    textAlign: 'center',
  },
  userIdText: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.6,
  },
}); 