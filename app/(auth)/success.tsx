import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext'; // Assuming ThemeContext exists
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { storage } from '../core/storage'; // UPDATED PATH
import { getWalletAddress, checkBalanceAndRequestFaucet, saveWalletToBackend } from '../internal/walletService'; // UPDATED PATH

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
        if (userId && typeof userId === 'string') {
          storage.set('userId', userId);
          console.log('User ID stored in secure storage:', userId);
        }

        // Get or create wallet address (walletService handles creation)
        const address = await getWalletAddress();
        console.log('Wallet address:', address);

        // Si tenemos un userId, intentamos guardar la wallet en el backend (solo una vez)
        if (userId && typeof userId === 'string') {
          try {
            // 1. Guardar la wallet en el backend
            setStatusMessage('Sincronizando wallet con el backend...');
            const saved = await saveWalletToBackend(userId);
            if (saved) {
              console.log('Wallet address saved in backend for user:', userId);
            } else {
              console.log('Could not save wallet address in backend. Will try again on next login.');
            }

            // 2. Verificar balance y solicitar tokens si es necesario (testnet only)
            setStatusMessage('Verificando balance de la wallet...');
            const balanceCheck = await checkBalanceAndRequestFaucet(userId);

            if (balanceCheck.faucetUsed) {
              setStatusMessage(`Tokens solicitados del faucet. Balance actual: ${balanceCheck.currentBalance} STX`);
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