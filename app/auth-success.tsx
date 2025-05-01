import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/ThemeContext'; // Assuming ThemeContext exists
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'; // Import viem functions
import { storage } from './core/storage'; // Import MMKV storage

// Define a key for storing the private key
const PRIVATE_KEY_STORAGE_KEY = 'userPrivateKey';

export default function AuthSuccessScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    console.log('Auth Success: User ID received:', userId);

    const handleWallet = () => {
      try {
        // Use MMKV's synchronous getString
        let privateKey = storage.getString(PRIVATE_KEY_STORAGE_KEY);

        if (!privateKey) {
          console.log('No private key found, generating a new wallet...');
          privateKey = generatePrivateKey();
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          // Use MMKV's synchronous set
          storage.set(PRIVATE_KEY_STORAGE_KEY, privateKey);
          console.log('New wallet generated and private key stored securely for address:', account.address);
          // You might want to associate the account.address with the userId in your backend here
        } else {
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          console.log('Existing private key loaded securely for address:', account.address);
        }

        // Redirect after handling the wallet
        // Using replace to prevent going back to the success screen
        // Correct path is '/wallet', not '/app/wallet'
        router.replace('/wallet');

      } catch (error) {
        console.error('Error handling wallet:', error);
        // Handle error appropriately, maybe redirect to an error screen or show an alert
        // For now, redirecting to wallet anyway, but ideally handle this case better
        router.replace('/wallet'); // Consider redirecting to an error page or /auth-error
      }
    };

    // Call the synchronous function to handle wallet logic
    handleWallet();

    // We don't need the timer anymore as redirection happens inside handleWallet
    // return () => clearTimeout(timer); // Remove timer cleanup

  }, [userId]); // Dependency array remains the same

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}>
      <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
      <ThemedText type="subtitle" style={styles.message}>
        Authentication Successful!
      </ThemedText>
      <ThemedText style={styles.message}>
        Welcome back! Redirecting you now...
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