import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native'; // Import necessary components
import { getWalletAddress } from './internal/walletService';

// This component will immediately redirect based on auth state handled in RootLayout
// Or it could perform an initial check itself
export default function Index() {
  const [initialRoute, setInitialRoute] = useState<Href | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Effect 1: Determine the initial route based on wallet address
  useEffect(() => {
    const determineRoute = async () => {
      try {
        console.log('index.tsx: Checking wallet address...');
        const address = await getWalletAddress();
        console.log('index.tsx: Wallet address result:', address);
        // These strings should align with your actual route structure
        const targetRoute: Href = address ? '/(app)' : '/(auth)/login';
        setInitialRoute(targetRoute);
      } catch (err: any) {
        console.error('index.tsx: Error getting wallet address:', err);
        setError('Failed to check wallet status.');
        // Optionally redirect to an error screen or stay on index with error message
      } finally {
        setIsLoading(false); // Stop loading indicator
      }
    };
    determineRoute();
  }, []);

  // Effect 2: Perform the redirect *after* initialRoute is set
  useEffect(() => {
    if (initialRoute) {
      console.log(`index.tsx: Redirecting to ${initialRoute}`);
      // router.replace is a side effect, so it should be in useEffect
      router.replace(initialRoute);
    }
  }, [initialRoute]);

  // Render loading indicator while checking wallet or waiting for redirect
  if (isLoading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Render error message if checking wallet failed
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error:</Text>
        <Text>{error}</Text>
        {/* Optionally add a retry button */}
      </View>
    );
  }

  // Render null while the redirect is happening via the useEffect above
  // This component's only job is to redirect, so it doesn't need to render anything else permanently.
  return null;
}