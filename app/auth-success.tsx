import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// This screen acts as a temporary catcher for the auth-success deep link.
// The actual logic (setting wallet, final redirect) is handled by the
// Linking event listener in app/_layout.tsx.
export default function AuthSuccessCatchScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    // Optional: Log that this screen was reached with params
    console.log('AuthSuccessCatchScreen reached with params:', params);
    
    // No explicit navigation here is strictly necessary if app/_layout.tsx's
    // Linking listener reliably handles the redirect quickly.
    // However, as a fallback or for quicker visual feedback, you could:
    // if (params.userId) {
    //   router.replace('/(app)/wallet'); // Or a generic loading screen
    // }
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 